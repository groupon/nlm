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

const run = require('../run');

const NLM_GIT_NAME = 'nlm';
const NLM_GIT_EMAIL = 'opensource@groupon.com';

function addFiles(cwd, files) {
  return run('git', ['add'].concat(files), {
    cwd,
  });
}

function commit(cwd, message) {
  return run('git', ['commit', '-m', message], {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: NLM_GIT_NAME,
      GIT_AUTHOR_EMAIL: NLM_GIT_EMAIL,
      GIT_COMMITTER_NAME: NLM_GIT_NAME,
      GIT_COMMITTER_EMAIL: NLM_GIT_EMAIL,
    },
  });
}

function getCurrentDate() {
  return new Date().toISOString().substring(0, 10);
}

function getHEAD(cwd) {
  return run('git', ['rev-parse', 'HEAD'], {
    cwd,
  });
}

function updatePackageLockVersion(cwd, name, version, files) {
  const lockPath = path.join(cwd, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return;

  const ignorePath = path.join(cwd, '.gitignore');

  if (fs.existsSync(ignorePath)) {
    const ignore = fs.readFileSync(ignorePath, 'utf8');
    // if package-lock.json is in the .gitignore, then we just generated it
    // and shouldn't commit it
    if (/^\/?package-lock\.json\s*$/m.test(ignore)) return;
  }

  // we don't want to risk re-sorting the file, so just do a regexp replace
  const oldLock = fs.readFileSync(lockPath, 'utf8');
  const newLock = oldLock
    // lockfile v1 & v2 "version" property at toplevel
    .replace(/^( {2}"version": ")[^"]+/m, `$1${version}`)
    // lockfile v2 entry under packages['']
    .replace(
      /^( {4}"": \{\n {6}"name": "([^"]+)",\n {6}"version": ")[^"]+/gm,
      (m, prefix, entryName) => (entryName === name ? prefix + version : m)
    );
  fs.writeFileSync(lockPath, newLock);
  files.push('package-lock.json');
}

async function createVersionCommit(cwd, pkg, options) {
  const changeLogFile = path.join(cwd, 'CHANGELOG.md');
  let changeLogContent;

  try {
    changeLogContent = `\n\n\n${fs.readFileSync(changeLogFile, 'utf8').trim()}`;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }

    changeLogContent = '';
  }

  changeLogContent = `### v${
    options.nextVersion
  } (${getCurrentDate()})\n<a id="v${options.nextVersion}"></a>\n${
    options.changelog
  }${changeLogContent}`;
  fs.writeFileSync(changeLogFile, `${changeLogContent.trim()}\n`);

  const packageJsonFile = path.join(cwd, 'package.json');
  pkg.version = options.nextVersion;
  fs.writeFileSync(packageJsonFile, `${JSON.stringify(pkg, null, 2)}\n`);

  const files = ['CHANGELOG.md', 'README.md', 'package.json'].reduce(
    (acc, file) => {
      if (fs.existsSync(path.join(cwd, file))) {
        acc.push(file);
      }

      return acc;
    },
    []
  );
  updatePackageLockVersion(cwd, pkg.name, pkg.version, files);

  const output = await addFiles(cwd, files)
    .then(commit.bind(null, cwd, `v${pkg.version}`))
    .then(getHEAD.bind(null, cwd));

  options.versionCommitSha = output.trim();
  return options.versionCommitSha;
}

module.exports = createVersionCommit;
