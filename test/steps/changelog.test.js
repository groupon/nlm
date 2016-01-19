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

var assert = require('assertive');

var generateChangeLog = require('../../lib/steps/changelog');

function withFakeGithub() {
  var httpCalls = [];
  var server;

  before(function (done) {
    server = require('http').createServer(function (req, res) {
      httpCalls.push({
        method: req.method,
        url: req.url,
        auth: req.headers.authorization,
      });
      res.setHeader('Content-Type', 'application/json');
      switch (req.url) {
        case '/api/v3/repos/usr/proj/pulls/1':
          res.end(JSON.stringify({
            user: { login: 'pr-1-user', html_url: 'http://pr-1-user' },
            html_url: 'http://pr-1',
            title: 'PR #1 Title',
          }));
          break;

        case '/api/v3/repos/usr/proj/pulls/1/commits':
          res.end(JSON.stringify([
            { sha: '1234567890123456789012345678901234567890' },
            { sha: '2234567890123456789012345678901234567890' },
          ]));
          break;

        case '/api/v3/repos/usr/proj/pulls/2':
          res.end(JSON.stringify({
            user: { login: 'pr-2-user', html_url: 'http://pr-2-user' },
            html_url: 'http://pr-2',
            title: 'PR #2 Title',
          }));
          break;

        case '/api/v3/repos/usr/proj/pulls/2/commits':
          res.end(JSON.stringify([
            // These commits are *not* part of the release.
            // This could happen, for example, when a foreign PR happens to
            // have an id that also exists in the current repo.
            { sha: 'e234567890123456789012345678901234567890' },
            { sha: 'f234567890123456789012345678901234567890' },
          ]));
          break;

        default:
          res.statusCode = 404;
          res.end('{"error":"Not found"}');
      }
    });
    server.listen(3000, done);
  });

  after(function (done) {
    server.close(done);
  });

  return httpCalls;
}

describe('generateChangeLog', function () {
  it('can create an empty changelog', function () {
    var pkg = { repository: 'usr/proj' };
    var commits = [];
    var options = { commits: commits };
    return generateChangeLog(null, pkg, options)
      .then(function (changelog) {
        assert.equal('', changelog);
      });
  });

  it('can create a changelog for two commits', function () {
    var pkg = { repository: 'usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
      },
    ];
    var options = { commits: commits };
    var href0 = 'https://github.com/usr/proj/commit/' + commits[0].sha;
    var href1 = 'https://github.com/usr/proj/commit/' + commits[1].sha;
    return generateChangeLog(null, pkg, options)
      .then(function (changelog) {
        assert.equal([
          '* [\`1234567\`](' + href0 + ') **fix:** Stop doing the wrong thing',
          '* [\`2234567\`](' + href1 + ') **feat:** Do more things',
        ].join('\n'), changelog);
      });
  });

  it('puts breaking changes ahead of everything else', function () {
    var pkg = { repository: 'usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
        notes: [
          {
            title: 'BREAKING CHANGE',
            text: 'The interface of this library changed in some way.',
          },
        ],
      },
    ];
    var options = { commits: commits };
    var href0 = 'https://github.com/usr/proj/commit/' + commits[0].sha;
    var href1 = 'https://github.com/usr/proj/commit/' + commits[1].sha;
    return generateChangeLog(null, pkg, options)
      .then(function (changelog) {
        assert.equal([
          '#### Breaking Changes',
          '',
          'The interface of this library changed in some way.',
          '',
          '*See: [\`2234567\`](' + href1 + ')*',
          '',
          '#### Commits',
          '',
          '* [\`1234567\`](' + href0 + ') **fix:** Stop doing the wrong thing',
          '* [\`2234567\`](' + href1 + ') **feat:** Do more things',
        ].join('\n'), changelog);
      });
  });

  describe('pull request commits', function () {
    var httpCalls = withFakeGithub();
    var pkg = { repository: 'http://127.0.0.1:3000/usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
      },
      {
        sha: '3234567890123456789012345678901234567890',
        type: 'pr',
        subject: 'Merge PR #1',
        pullId: '1',
      },
    ];
    var options = { commits: commits };
    var changelog = null;

    before('generateChangeLog', function () {
      return generateChangeLog(null, pkg, options)
        .then(function (_changelog) {
          changelog = _changelog;
        });
    });

    it('calls out to github to get PR info', function () {
      assert.equal(2, httpCalls.length);
    });

    it('groups commits by pull request', function () {
      assert.include('* PR #1 Title', changelog);
      assert.include('  - [`1234567`]', changelog);
    });
  });

  describe('with an invalid PR', function () {
    var httpCalls = withFakeGithub();
    var pkg = { repository: 'http://127.0.0.1:3000/usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
      },
      {
        sha: '3234567890123456789012345678901234567890',
        type: 'pr',
        subject: 'Merge PR #2',
        pullId: '2',
      },
    ];
    var options = { commits: commits };
    var changelog = null;

    before('generateChangeLog', function () {
      return generateChangeLog(null, pkg, options)
        .then(function (_changelog) {
          changelog = _changelog;
        });
    });

    it('calls out to github to get PR info', function () {
      assert.equal(2, httpCalls.length);
    });

    it('ignores the PR', function () {
      assert.notInclude('* PR #2 Title', changelog);
      assert.include('* [`1234567`]', changelog);
    });
  });

  describe('with a missing PR', function () {
    var httpCalls = withFakeGithub();
    var pkg = { repository: 'http://127.0.0.1:3000/usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
      },
      {
        sha: '3234567890123456789012345678901234567890',
        type: 'pr',
        subject: 'Merge PR #3',
        pullId: '3',
      },
    ];
    var options = { commits: commits };
    var changelog = null;

    before('generateChangeLog', function () {
      return generateChangeLog(null, pkg, options)
        .then(function (_changelog) {
          changelog = _changelog;
        });
    });

    it('calls out to github to get PR info', function () {
      assert.equal(2, httpCalls.length);
    });

    it('ignores the PR', function () {
      assert.include('* [`1234567`]', changelog);
    });
  });
});
