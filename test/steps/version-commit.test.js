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

const { execFile } = require('child_process');

const fs = require('fs');
const path = require('path');

const assert = require('assert');

const createVersionCommit = require('../../lib/steps/version-commit');

const withFixture = require('../fixture');

const DEF_PKG = {
  name: 'some-package',
  version: '0.0.0',
};
const DEF_OPTS = {
  nextVersion: '1.0.0',
  changelog: '* New stuff\n* Interesting features',
};

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

describe('createVersionCommit', () => {
  let pkg;
  let options;

  function resetVars() {
    pkg = cloneDeep(DEF_PKG);
    options = cloneDeep(DEF_OPTS);
  }

  before(resetVars);
  afterEach(resetVars);

  describe('with no package-lock.json', () => {
    const dirname = withFixture('multiple-commits');
    let currentDate;

    before('commits with the original author', done => {
      execFile('git', ['show'], { cwd: dirname }, (err, stdout) => {
        if (err) return done(err);

        assert.ok(
          stdout.includes('Author: Robin Developer <rdev@example.com>')
        );
        return done();
      });
    });

    before('create version commit', () => {
      currentDate = new Date().toISOString().substring(0, 10);
      return createVersionCommit(dirname, pkg, options);
    });

    it('writes the correct HEAD sha', () => {
      const HEAD = fs
        .readFileSync(`${dirname}/.git/refs/heads/master`, 'utf8')
        .trim();

      assert.strictEqual(options.versionCommitSha, HEAD);
    });

    it('writes the correct CHANGELOG', () => {
      const [version, , commit1, commit2] = fs
        .readFileSync(`${dirname}/CHANGELOG.md`, 'utf8')
        .split('\n');

      assert.strictEqual(version, `### v1.0.0 (${currentDate})`);
      assert.strictEqual(commit1, '* New stuff');
      assert.strictEqual(commit2, '* Interesting features');
    });

    it('commits with the proper user', done => {
      execFile('git', ['show'], { cwd: dirname }, (err, stdout) => {
        if (err) return done(err);

        assert.ok(stdout.includes('Author: nlm <opensource@groupon.com>'));
        return done();
      });
    });

    it('works with no README.md present', () => {
      fs.unlinkSync(path.join(dirname, 'README.md'));

      assert.doesNotThrow(() => {
        currentDate = new Date().toISOString().substring(0, 10);
        return createVersionCommit(dirname, pkg, options);
      });
    });
  });

  describe('using package-lock.json', () => {
    const dirname = withFixture('with-plock');

    before('create version commit', () =>
      createVersionCommit(dirname, pkg, options)
    );

    it('bumps the package-lock version number', done => {
      execFile(
        'git',
        ['show', 'HEAD:package-lock.json'],
        { cwd: dirname },
        (err, json) => {
          if (err) return void done(err);

          assert.strictEqual(JSON.parse(json).version, '1.0.0');
          done();
        }
      );
    });
  });

  describe('with unused package-lock.json', () => {
    const dirname = withFixture('with-bogus-plock');

    before('create version commit', () =>
      createVersionCommit(dirname, pkg, options)
    );

    it("doesn't touch change it", done => {
      execFile(
        'git',
        ['show', 'HEAD:package-lock.json'],
        { cwd: dirname },
        err => {
          assert.ok(err);
          const json = fs.readFileSync(`${dirname}/package-lock.json`, 'utf8');

          assert.notStrictEqual(JSON.parse(json).version, '1.0.0');
          done();
        }
      );
    });
  });
});
