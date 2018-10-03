/*
 * Copyright (c) 2015, Groupon, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of GROUPON nor the names of its contributors may be
 * used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const Bluebird = require('bluebird');
const debug = require('debug')('nlm:license');
const globAsync = Bluebird.promisify(require('glob'));
const _ = require('lodash');

const readFileAsync = Bluebird.promisify(fs.readFile);
const writeFileAsync = Bluebird.promisify(fs.writeFile);

const COMMENT_TYPES = {
  '.js': {
    getLicenseHeader: function getLicenseHeader(licenseText) {
      const body = licenseText
        .split('\n')
        .map(line => {
          return ` ${`* ${line}`.trim()}`;
        })
        .join('\n');
      return `/*\n${body}\n */`;
    },
  },
  '.coffee': {
    getLicenseHeader: function getLicenseHeader(licenseText) {
      return `###\n${licenseText}\n###`;
    },
  },
};

function collectFiles(cwd, whitelist, optionalExclude) {
  const exclude = ['node_modules/**/*', './node_modules/**/*'].concat(
    optionalExclude || []
  );

  function scanDirectory(directory) {
    return globAsync(`${directory}/**/*.{js,coffee}`, {
      ignore: exclude,
      nodir: true,
      cwd: cwd,
      root: cwd, // so /lib works as "expected"
    });
  }

  return Bluebird.map(whitelist || ['.'], scanDirectory)
    .then(_.flatten)
    .map(relFilename => {
      const filename = path.join(cwd, relFilename);
      return Bluebird.props({
        filename: filename,
        content: readFileAsync(filename, 'utf8'),
      });
    });
}

function hasNoLicenseHeader(entry) {
  return entry.content.indexOf(entry.licenseHeader) === -1;
}

function addLicenseHeader(entry) {
  debug('Adding license', entry.filename);
  entry.content = `${entry.licenseHeader}\n${entry.content}`;
  return entry;
}

function addMissingLicenseHeaders(licenseText, files) {
  const licenseHeaders = {
    '.js': COMMENT_TYPES['.js'].getLicenseHeader(licenseText),
    '.coffee': COMMENT_TYPES['.coffee'].getLicenseHeader(licenseText),
  };
  return files
    .map(file => {
      file.licenseHeader = licenseHeaders[path.extname(file.filename)];
      return file;
    })
    .filter(hasNoLicenseHeader)
    .map(addLicenseHeader);
}

function getLicenseText(cwd) {
  return readFileAsync(path.join(cwd, 'LICENSE'), 'utf8')
    .then(_.trim)
    .catch(error => {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    });
}

function collectMissingHeaders(cwd, whitelist, optionalExclude, licenseText) {
  // No license available?
  if (licenseText === null) {
    debug('No LICENSE file found, skipping license headers');
    return [];
  }

  return collectFiles(cwd, whitelist, optionalExclude).then(
    _.partial(addMissingLicenseHeaders, licenseText)
  );
}

function writeLicenseHeaders(entry) {
  return writeFileAsync(entry.filename, entry.content, 'utf8').then(
    _.constant(entry.filename)
  );
}

function addLicenseHeaders(cwd, whitelist, optionalExclude) {
  return getLicenseText(cwd)
    .then(_.partial(collectMissingHeaders, cwd, whitelist, optionalExclude))
    .map(writeLicenseHeaders);
}
module.exports = addLicenseHeaders;

addLicenseHeaders.collectMissing = collectMissingHeaders;
