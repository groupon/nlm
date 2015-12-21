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

var fs = require('fs');

var assert = require('assertive');

var addLicenseHeaders = require('../../lib/license');

var withFixture = require('../fixture');

describe('addLicenseHeaders', function () {
  it('does not try to add additional headers to nlm', function () {
    return addLicenseHeaders(process.cwd(), ['lib', 'test'])
      .then(function (changedFiles) {
        assert.deepEqual([], changedFiles);
      });
  });

  describe('without a LICENSE file', function () {
    var dirname = withFixture('fix-commit');

    it('does nothing', function () {
      return addLicenseHeaders(dirname)
        .then(function (changedFiles) {
          assert.deepEqual([], changedFiles);
        });
    });
  });

  describe('with a file w/o license header', function () {
    var dirname = withFixture('fix-commit');
    var filename = dirname + '/index.js';

    var licenseText = '\n\nIMPORTANT\n\nLEGAL\nSTUFF HERE!\n\t \n';
    var licenseHeader = '/*\n * IMPORTANT\n *\n * LEGAL\n * STUFF HERE!\n */\n';

    before('write license file', function () {
      fs.writeFileSync(dirname + '/LICENSE', licenseText);
    });

    before('returns the absolute filename', function () {
      return addLicenseHeaders(dirname)
        .then(function (changedFiles) {
          assert.deepEqual([filename], changedFiles);
        });
    });

    it('writes out a file with a license header', function () {
      var content = fs.readFileSync(filename, 'utf8');
      assert.include(licenseHeader, content);
      assert.expect('Starts with the header', content.indexOf(licenseHeader) === 0);
    });
  });
});
