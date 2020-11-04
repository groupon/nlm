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

/* eslint-disable import/no-dynamic-require */

'use strict';

const assert = require('assert');

const publishToNpm = require('../../lib/steps/publish-to-npm');

const withFixture = require('../fixture');

function withFakeRegistry() {
  const httpCalls = [];
  let server;
  before(done => {
    server = require('http').createServer((req, res) => {
      httpCalls.push({
        method: req.method,
        url: req.url,
        auth: req.headers.authorization,
      });

      if (req.method === 'GET' && req.url === '/nlm-test-pkg') {
        res.statusCode = 404;
        return void res.end('{}');
      }

      res.statusCode = 200;

      if (req.url === '/nlm-test-pkg?write=true') {
        res.end(
          JSON.stringify({
            ok: true,
            versions: {
              '1.0.0': {},
            },
          })
        );
      } else {
        res.end('{"ok":true}');
      }
    });
    server.listen(3000, done);
  });
  after(done => {
    server.close(done);
  });
  return httpCalls;
}

describe('publishToNpm', () => {
  describe('with NPM_USERNAME etc.', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('sends basic auth headers', async function () {
      this.timeout(4000);

      await publishToNpm(dirname, require(`${dirname}/package.json`), {
        currentBranch: 'master',
        distTag: 'latest',
        commit: true,
        npmUsername: 'robin',
        npmPasswordBase64: Buffer.from('passw0rd').toString('base64'),
        npmEmail: 'robin@example.com',
        npmToken: '',
      });

      assert.deepStrictEqual(
        httpCalls.filter(c => c.method !== 'GET'),
        [
          {
            method: 'PUT',
            url: '/nlm-test-pkg',
            auth: `Basic ${Buffer.from('robin:passw0rd').toString('base64')}`,
          },
        ]
      );
    });
  });

  function getTokenOptions(overrides) {
    return {
      currentBranch: 'master',
      distTag: 'latest',
      commit: true,
      npmUsername: '',
      npmPasswordBase64: '',
      npmEmail: '',
      npmToken: 'some-access-token',
      ...overrides,
    };
  }

  describe('with NPM_TOKEN etc.', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('uses a bearer token', async function () {
      this.timeout(4000);

      const pkg = require(`${dirname}/package.json`);

      await publishToNpm(dirname, pkg, getTokenOptions());

      assert.deepStrictEqual(
        httpCalls.filter(c => c.method !== 'GET'),
        [
          {
            method: 'PUT',
            url: '/nlm-test-pkg',
            auth: 'Bearer some-access-token',
          },
        ]
      );
    });
  });

  describe('with nlm.deprecated set', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('tries to deprecate', async function () {
      this.timeout(4000);

      const pkg = require(`${dirname}/package.json`);

      const opts = getTokenOptions({
        deprecated: 'reason',
      });
      await publishToNpm(dirname, pkg, opts);
      const putReq = {
        method: 'PUT',
        url: '/nlm-test-pkg',
        auth: 'Bearer some-access-token',
      };

      assert.deepStrictEqual(
        httpCalls.filter(c => c.method !== 'GET'),
        [putReq, putReq]
      );
    });
  });

  describe('without --commmit', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('makes no http calls', async () => {
      const opts = getTokenOptions({
        commit: false,
        deprecated: 'foo',
      });
      await publishToNpm(dirname, require(`${dirname}/package.json`), opts);

      assert.deepStrictEqual(httpCalls, []);
    });
  });

  describe('if the package is set to private', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('makes no http calls', async () => {
      const pkg = {
        private: true,
        ...require(`${dirname}/package.json`),
      };
      await publishToNpm(dirname, pkg, getTokenOptions());

      assert.deepStrictEqual(httpCalls, []);
    });
  });
});
