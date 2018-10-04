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

const assert = require('assertive');

const generateChangeLog = require('../../lib/steps/changelog');

function withFakeGithub() {
  const httpCalls = [];
  let server;

  before(done => {
    server = require('http').createServer((req, res) => {
      httpCalls.push({
        method: req.method,
        url: req.url,
        auth: req.headers.authorization,
      });
      res.setHeader('Content-Type', 'application/json');
      switch (req.url) {
        case '/api/v3/repos/usr/proj/pulls/1':
          res.end(
            JSON.stringify({
              user: { login: 'pr-1-user', html_url: 'http://pr-1-user' },
              html_url: 'http://pr-1',
              title: 'PR #1 Title',
            })
          );
          break;

        case '/api/v3/repos/usr/proj/pulls/1/commits':
          res.end(
            JSON.stringify([
              { sha: '1234567890123456789012345678901234567890' },
              { sha: '2234567890123456789012345678901234567890' },
            ])
          );
          break;

        case '/api/v3/repos/usr/proj/pulls/2':
          res.end(
            JSON.stringify({
              user: { login: 'pr-2-user', html_url: 'http://pr-2-user' },
              html_url: 'http://pr-2',
              title: 'PR #2 Title',
            })
          );
          break;

        case '/api/v3/repos/usr/proj/pulls/2/commits':
          res.end(
            JSON.stringify([
              // These commits are *not* part of the release.
              // This could happen, for example, when a foreign PR happens to
              // have an id that also exists in the current repo.
              { sha: 'e234567890123456789012345678901234567890' },
              { sha: 'f234567890123456789012345678901234567890' },
            ])
          );
          break;

        default:
          res.statusCode = 404;
          res.end('{"error":"Not found"}');
      }
    });
    server.listen(3000, done);
  });

  after(done => {
    server.close(done);
  });

  return httpCalls;
}

describe('generateChangeLog', () => {
  it('can create an empty changelog', () => {
    const pkg = { repository: 'usr/proj' };
    const commits = [];
    const options = { commits: commits };
    return generateChangeLog(null, pkg, options).then(changelog => {
      assert.equal('', changelog);
    });
  });

  it('links to github issues and jira tickets', () => {
    const pkg = { repository: 'usr/proj' };
    const commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
        references: [
          {
            action: 'Closes',
            issue: '7',
            prefix: 'fo/ba#',
            href: 'https://gitub.com/fo/ba/issues/7',
          },
        ],
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
        references: [
          {
            action: 'Resolves',
            issue: '2010',
            prefix: 'THING-',
            href: 'https://example.com/browse/THING-7',
          },
          {
            action: 'Fixes',
            issue: '44',
            prefix: '#',
            href: 'https://github.com/usr/proj/issues/44',
          },
        ],
      },
    ];
    const options = { commits: commits };
    const href0 = `https://github.com/usr/proj/commit/${commits[0].sha}`;
    const href1 = `https://github.com/usr/proj/commit/${commits[1].sha}`;
    return generateChangeLog(null, pkg, options).then(changelog => {
      const lines = changelog.split('\n');
      assert.equal(
        `* [\`1234567\`](${href0}) **fix:** Stop doing the wrong thing - see: ` +
          `[fo/ba#7](https://gitub.com/fo/ba/issues/7)`,
        lines[0]
      );
      assert.equal(
        `* [\`2234567\`](${href1}) **feat:** Do more things - see: ` +
          `[THING-2010](https://example.com/browse/THING-7), ` +
          `[#44](https://github.com/usr/proj/issues/44)`,
        lines[1]
      );
    });
  });

  it('can create a changelog for two commits', () => {
    const pkg = { repository: 'usr/proj' };
    const commits = [
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
    const options = { commits: commits };
    const href0 = `https://github.com/usr/proj/commit/${commits[0].sha}`;
    const href1 = `https://github.com/usr/proj/commit/${commits[1].sha}`;
    return generateChangeLog(null, pkg, options).then(changelog => {
      assert.equal(
        [
          `* [\`1234567\`](${href0}) **fix:** Stop doing the wrong thing`,
          `* [\`2234567\`](${href1}) **feat:** Do more things`,
        ].join('\n'),
        changelog
      );
    });
  });

  it('puts breaking changes ahead of everything else', () => {
    const pkg = { repository: 'usr/proj' };
    const commits = [
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
    const options = { commits: commits };
    const href0 = `https://github.com/usr/proj/commit/${commits[0].sha}`;
    const href1 = `https://github.com/usr/proj/commit/${commits[1].sha}`;
    return generateChangeLog(null, pkg, options).then(changelog => {
      assert.equal(
        [
          '#### Breaking Changes',
          '',
          'The interface of this library changed in some way.',
          '',
          `*See: [\`2234567\`](${href1})*`,
          '',
          '#### Commits',
          '',
          `* [\`1234567\`](${href0}) **fix:** Stop doing the wrong thing`,
          `* [\`2234567\`](${href1}) **feat:** Do more things`,
        ].join('\n'),
        changelog
      );
    });
  });

  describe('pull request commits', () => {
    const httpCalls = withFakeGithub();
    const pkg = { repository: 'http://127.0.0.1:3000/usr/proj' };
    const commits = [
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
    const options = { commits: commits };
    let changelog = null;

    before('generateChangeLog', () => {
      return generateChangeLog(null, pkg, options).then(_changelog => {
        changelog = _changelog;
      });
    });

    it('calls out to github to get PR info', () => {
      assert.equal(2, httpCalls.length);
    });

    it('groups commits by pull request', () => {
      assert.include('* PR #1 Title', changelog);
      assert.include('  - [`1234567`]', changelog);
    });
  });

  describe('with an invalid PR', () => {
    const httpCalls = withFakeGithub();
    const pkg = { repository: 'http://127.0.0.1:3000/usr/proj' };
    const commits = [
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
    const sloppyCommits = commits.map(commit => {
      if (commit.type === 'pr') return commit;
      return { sha: commit.sha, header: commit.subject };
    });
    const options = { commits: commits };
    let changelog = null;
    let sloppyChangelog = null;

    before('generateChangeLog', () => {
      return generateChangeLog(null, pkg, options).then(_changelog => {
        changelog = _changelog;
      });
    });

    before('generateSloppyChangeLog', () => {
      return generateChangeLog(null, pkg, { commits: sloppyCommits }).then(
        _changelog => {
          sloppyChangelog = _changelog;
        }
      );
    });

    it('calls out to github to get PR info', () => {
      assert.equal(4, httpCalls.length);
    });

    it('ignores the PR', () => {
      assert.notInclude('* PR #2 Title', changelog);
      assert.include('* [`1234567`]', changelog);
    });

    it('handles poorly formatted commit messages too', () => {
      assert.include(') Stop doing the wrong thing\n', sloppyChangelog);
      assert.include(') Do more things', sloppyChangelog);
    });
  });

  describe('with a missing PR', () => {
    const httpCalls = withFakeGithub();
    const pkg = { repository: 'http://127.0.0.1:3000/usr/proj' };
    const commits = [
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
    const options = { commits: commits };
    let changelog = null;

    before('generateChangeLog', () => {
      return generateChangeLog(null, pkg, options).then(_changelog => {
        changelog = _changelog;
      });
    });

    it('calls out to github to get PR info', () => {
      assert.equal(2, httpCalls.length);
    });

    it('ignores the PR', () => {
      assert.include('* [`1234567`]', changelog);
    });
  });
});
