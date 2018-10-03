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

const assert = require('assertive');
const _ = require('lodash');

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
        return res.end('{}');
      }
      res.statusCode = 200;
      res.end('{"ok":true}');
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

    it('sends basic auth headers', function() {
      this.timeout(4000);
      return publishToNpm(dirname, require(`${dirname}/package.json`), {
        currentBranch: 'master',
        distTag: 'latest',
        commit: true,
        npmUsername: 'robin',
        npmPasswordBase64: new Buffer('passw0rd').toString('base64'),
        npmEmail: 'robin@example.com',
        npmToken: '',
      }).then(() => {
        assert.deepEqual(
          {
            method: 'PUT',
            url: '/nlm-test-pkg',
            auth: `Basic ${new Buffer('robin:passw0rd').toString('base64')}`,
          },
          httpCalls.pop()
        );
      });
    });
  });

  function getTokenOptions(overrides) {
    return _.extend(
      {
        currentBranch: 'master',
        distTag: 'latest',
        commit: true,
        npmUsername: '',
        npmPasswordBase64: '',
        npmEmail: '',
        npmToken: 'some-access-token',
      },
      overrides
    );
  }

  describe('with NPM_TOKEN etc.', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('uses a bearer token', function() {
      this.timeout(4000);
      const pkg = require(`${dirname}/package.json`);
      return publishToNpm(dirname, pkg, getTokenOptions()).then(() => {
        assert.deepEqual(
          {
            method: 'PUT',
            url: '/nlm-test-pkg',
            auth: 'Bearer some-access-token',
          },
          httpCalls.pop()
        );
      });
    });
  });

  describe('without --commmit', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('makes no http calls', () => {
      const opts = getTokenOptions({ commit: false });
      return publishToNpm(
        dirname,
        require(`${dirname}/package.json`),
        opts
      ).then(() => {
        assert.deepEqual([], httpCalls);
      });
    });
  });

  describe('if the package is set to private', () => {
    const dirname = withFixture('released');
    const httpCalls = withFakeRegistry();

    it('makes no http calls', () => {
      const pkg = _.defaults(
        {
          private: true,
        },
        require(`${dirname}/package.json`)
      );
      return publishToNpm(dirname, pkg, getTokenOptions()).then(() => {
        assert.deepEqual([], httpCalls);
      });
    });
  });
});
