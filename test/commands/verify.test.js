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

const assert = require('assert');

const run = require('../../lib/run');

const withFixture = require('../fixture');

const CLI_PATH = require.resolve('../../lib/cli');

describe('nlm verify', () => {
  describe('in non-git directory', () => {
    const dirname = withFixture('non-git');
    let stdout;

    before(async () => {
      stdout = await run(process.execPath, [CLI_PATH, 'verify'], {
        cwd: dirname,
        env: { ...process.env, GH_TOKEN: '' },
      });
    });

    it('ignores directories that are not git repos', () => {
      assert.strictEqual(stdout, '');
    });
  });

  describe('in git directory with no changes', () => {
    const dirname = withFixture('released');
    let stdout;

    before(async () => {
      stdout = await run(process.execPath, [CLI_PATH, 'verify'], {
        cwd: dirname,
        env: { ...process.env, GH_TOKEN: '' },
      });
    });

    it('reports "none" change', () => {
      assert.ok(stdout.includes('Changes are "none"'), stdout);
    });
  });

  describe('in git directory with changes', () => {
    const dirname = withFixture('verify-fix-commit');
    let stdout;

    before(async () => {
      stdout = await run(process.execPath, [CLI_PATH, 'verify'], {
        cwd: dirname,
        env: { ...process.env, GH_TOKEN: '' },
      });
    });

    it('reports the change type and the version increment', async () => {
      assert.strictEqual(
        stdout.trim(),
        '[nlm] Changes are "patch" (1.0.0 -> 1.0.1)'
      );
    });
  });

  describe('CI PR id env vars', function () {
    this.timeout(5000);
    const dirname = withFixture('verify-fix-commit');
    let stdout;

    it('is able to read various CI env vars to determine the PR id', async () => {
      const testCases = new Map([
        [{ DOTCI_PULL_REQUEST: '1' }, '1'],
        [{ GITHUB_PULL_REQUEST: '2' }, '2'],
        [{ ghprbPullId: '3' }, '3'],
        [{ TRAVIS_PULL_REQUEST: '4' }, '4'],
        [{ GITHUB_ACTIONS: 'true', GITHUB_REF: 'refs/pull/5/merges' }, '5'],
        [{ CIRCLE_PULL_REQUEST: 'pull/6' }, '6'],
      ]);

      for (const [envs, expected] of testCases) {
        stdout = await run(process.execPath, [CLI_PATH, 'verify'], {
          cwd: dirname,
          env: {
            ...process.env,
            GH_TOKEN: '',
            ...envs,
          },
        });

        assert.ok(
          stdout.trim().includes(`Skipping PR #${expected}`),
          `env var test case: "${JSON.stringify(envs)}"`
        );
      }
    });
  });
});
