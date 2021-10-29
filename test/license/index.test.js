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

const assert = require('assert');

const addLicenseHeaders = require('../../lib/license');

const withFixture = require('../fixture');

describe('addLicenseHeaders', () => {
  it('does not try to add additional headers to nlm', async () => {
    const changedFiles = await addLicenseHeaders(process.cwd(), [
      'lib',
      'test',
    ]);
    assert.deepStrictEqual(changedFiles, []);
  });

  describe('without a LICENSE file', () => {
    const dirname = withFixture('fix-commit');

    it('does nothing', async () => {
      const changedFiles = await addLicenseHeaders(dirname);

      assert.deepStrictEqual(changedFiles, []);
    });
  });

  describe('with a file w/o license header', () => {
    const dirname = withFixture('fix-commit');
    const filename = `${dirname}/index.js`;
    const licenseText = '(c) 1999\n\nIMPORTANT\n\nLEGAL\nSTUFF HERE!\n\t \n';
    const curYear = new Date().getFullYear();
    const licenseHeader = `/*\n * (c) ${curYear}\n *\n * IMPORTANT\n *\n * LEGAL\n * STUFF HERE!\n */\n`;

    before('write license file', () => {
      fs.writeFileSync(`${dirname}/LICENSE`, licenseText);
    });

    before('returns the absolute filename', async () => {
      const changedFiles = await addLicenseHeaders(dirname);

      assert.deepStrictEqual(changedFiles, [filename]);
    });

    it('writes out a file with a license header w/ current year', () => {
      const content = fs.readFileSync(filename, 'utf8');

      assert.ok(content.includes(licenseHeader));
      assert.strictEqual(
        content.indexOf(licenseHeader),
        0,
        'Starts with the header'
      );
    });
  });

  describe('with a ts file w/o a license header', () => {
    const dirname = withFixture('merge-commit');
    const filename = `${dirname}/merge.ts`;

    it('adds the header', async () => {
      fs.writeFileSync(`${dirname}/LICENSE`, 'SIMPLE');

      const changedFiles = await addLicenseHeaders(dirname);
      assert.deepStrictEqual(changedFiles, [filename]);
      assert.strictEqual(
        fs.readFileSync(filename, 'utf8'),
        `\
/*
 * SIMPLE
 */
import { mittens } from 'kittens';
`
      );
    });
  });
});
