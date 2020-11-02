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

const generateChangeLog = require('../../lib/steps/changelog');

function responseByUrl(url) {
  const res = {};
  switch (url) {
    case '/api/v3/repos/usr/proj/pulls/1':
      res.chunk = JSON.stringify({
        user: {
          login: 'pr-1-user',
          html_url: 'http://pr-1-user',
        },
        html_url: 'http://pr-1',
        title: 'PR #1 Title',
      });
      break;

    case '/api/v3/repos/usr/proj/pulls/1/commits':
      res.chunk = JSON.stringify([
        {
          sha: '1234567890123456789012345678901234567890',
        },
        {
          sha: '2234567890123456789012345678901234567890',
        },
      ]);
      break;

    case '/api/v3/repos/usr/proj/pulls/2':
      res.chunk = JSON.stringify({
        user: {
          login: 'pr-2-user',
          html_url: 'http://pr-2-user',
        },
        html_url: 'http://pr-2',
        title: 'PR #2 Title',
      });
      break;

    case '/api/v3/repos/usr/proj/pulls/2/commits':
      res.chunk = JSON.stringify([
        // These commits are *not* part of the release.
        // This could happen, for example, when a foreign PR happens to
        // have an id that also exists in the current repo.
        {
          sha: 'e234567890123456789012345678901234567890',
        },
        {
          sha: 'f234567890123456789012345678901234567890',
        },
      ]);
      break;

    default:
      res.statusCode = 404;
      res.chunk = '{"error":"Not found"}';
  }

  return res;
}

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

      const { chunk, statusCode } = responseByUrl(req.url);
      if (statusCode) {
        res.statusCode = statusCode;
      }
      res.end(chunk);
    });
    server.listen(3000, done);
  });
  after(done => {
    server.close(done);
  });
  return httpCalls;
}

describe('generateChangeLog', () => {
  const defaultOptions = {
    emoji: {
      skip: true,
    },
  };

  it('can create an empty changelog', async () => {
    const pkg = {
      repository: 'usr/proj',
    };
    const commits = [];
    const options = {
      ...defaultOptions,
      commits,
    };

    const changelog = await generateChangeLog(null, pkg, options);

    assert.strictEqual(changelog, '');
  });

  it('links to github issues and jira tickets', async () => {
    const pkg = {
      repository: 'usr/proj',
    };
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
    const options = {
      ...defaultOptions,
      commits,
    };
    const href0 = `https://github.com/usr/proj/commit/${commits[0].sha}`;
    const href1 = `https://github.com/usr/proj/commit/${commits[1].sha}`;

    const changelog = await generateChangeLog(null, pkg, options);
    const lines = changelog.split('\n');

    assert.strictEqual(
      lines[0],
      `* [\`1234567\`](${href0}) **fix:** Stop doing the wrong thing - see: ` +
        `[fo/ba#7](https://gitub.com/fo/ba/issues/7)`
    );
    assert.strictEqual(
      lines[1],
      `* [\`2234567\`](${href1}) **feat:** Do more things - see: ` +
        `[THING-2010](https://example.com/browse/THING-7), ` +
        `[#44](https://github.com/usr/proj/issues/44)`
    );
  });

  it('can create a changelog for two commits', async () => {
    const pkg = {
      repository: 'usr/proj',
    };
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
    const options = {
      ...defaultOptions,
      commits,
    };
    const href0 = `https://github.com/usr/proj/commit/${commits[0].sha}`;
    const href1 = `https://github.com/usr/proj/commit/${commits[1].sha}`;

    const changelog = await generateChangeLog(null, pkg, options);

    assert.strictEqual(
      changelog,
      [
        `* [\`1234567\`](${href0}) **fix:** Stop doing the wrong thing`,
        `* [\`2234567\`](${href1}) **feat:** Do more things`,
      ].join('\n')
    );
  });

  it('puts breaking changes ahead of everything else', async () => {
    const pkg = {
      repository: 'usr/proj',
    };
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
    const options = {
      ...defaultOptions,
      commits,
    };
    const href0 = `https://github.com/usr/proj/commit/${commits[0].sha}`;
    const href1 = `https://github.com/usr/proj/commit/${commits[1].sha}`;

    const changelog = await generateChangeLog(null, pkg, options);
    assert.strictEqual(
      changelog,
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
      ].join('\n')
    );
  });

  it('handles variants typings of BREAKING CHANGE', async () => {
    const pkg = {
      repository: 'usr/proj',
    };
    const commits = [
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
        notes: [
          {
            title: 'BREAKING CHANGE',
            text: 'without a colon',
          },
        ],
      },
      {
        sha: '2234567890123456789012345678901234567891',
        type: 'feat',
        subject: 'Do more things',
        notes: [
          {
            title: 'BREAKING CHANGE:',
            text: 'with a colon',
          },
        ],
      },
      {
        sha: '2234567890123456789012345678901234567892',
        type: 'feat',
        subject: 'Do more things',
        notes: [
          {
            title: 'BREAKING CHANGES',
            text: 'plural',
          },
        ],
      },
      {
        sha: '2234567890123456789012345678901234567893',
        type: 'feat',
        subject: 'Do more things',
        notes: [
          {
            title: 'BREAKING CHANGES:',
            text: 'plural with colon',
          },
        ],
      },
    ];
    const options = {
      ...defaultOptions,
      commits,
    };
    const href0 = `https://github.com/usr/proj/commit/${commits[0].sha}`;
    const href1 = `https://github.com/usr/proj/commit/${commits[1].sha}`;
    const href2 = `https://github.com/usr/proj/commit/${commits[2].sha}`;
    const href3 = `https://github.com/usr/proj/commit/${commits[3].sha}`;

    const changelog = await generateChangeLog(null, pkg, options);
    assert.strictEqual(
      changelog,
      [
        '#### Breaking Changes',
        '',
        'without a colon',
        '',
        `*See: [\`2234567\`](${href0})*`,
        '',
        'with a colon',
        '',
        `*See: [\`2234567\`](${href1})*`,
        '',
        'plural',
        '',
        `*See: [\`2234567\`](${href2})*`,
        '',
        'plural with colon',
        '',
        `*See: [\`2234567\`](${href3})*`,
        '',
        '#### Commits',
        '',
        `* [\`2234567\`](${href0}) **feat:** Do more things`,
        `* [\`2234567\`](${href1}) **feat:** Do more things`,
        `* [\`2234567\`](${href2}) **feat:** Do more things`,
        `* [\`2234567\`](${href3}) **feat:** Do more things`,
      ].join('\n')
    );
  });

  describe('PRs', () => {
    const pkg = {
      repository: 'http://127.0.0.1:3000/usr/proj',
    };

    describe('pull request commits', () => {
      const httpCalls = withFakeGithub();
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
      const options = {
        ...defaultOptions,
        commits,
      };
      let changelog;

      before('generateChangeLog', async () => {
        changelog = await generateChangeLog(null, pkg, options);
      });

      it('calls out to github to get PR info', () => {
        assert.strictEqual(httpCalls.length, 2);
      });

      it('groups commits by pull request', () => {
        assert.ok(changelog.includes('* PR #1 Title'));
        assert.ok(changelog.includes('  - [`1234567`]'));
      });
    });

    describe('with an invalid PR', () => {
      const httpCalls = withFakeGithub();
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
        return {
          sha: commit.sha,
          header: commit.subject,
        };
      });
      const options = {
        ...defaultOptions,
        commits,
      };
      let changelog = null;
      let sloppyChangelog = null;

      before('generateChangeLog', async () => {
        changelog = await generateChangeLog(null, pkg, options);
      });

      before('generateSloppyChangeLog', async () => {
        sloppyChangelog = await generateChangeLog(null, pkg, {
          ...defaultOptions,
          commits: sloppyCommits,
        });
      });

      it('calls out to github to get PR info', () => {
        assert.strictEqual(httpCalls.length, 4);
      });

      it('ignores the PR', () => {
        assert.ok(!changelog.includes('* PR #2 Title'));
        assert.ok(changelog.includes('* [`1234567`]'));
      });

      it('handles poorly formatted commit messages too', () => {
        assert.ok(sloppyChangelog.includes(') Stop doing the wrong thing\n'));
        assert.ok(sloppyChangelog.includes(') Do more things'));
      });
    });

    describe('with a missing PR', () => {
      const httpCalls = withFakeGithub();
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
      const options = {
        ...defaultOptions,
        commits,
      };
      let changelog = null;

      before('generateChangeLog', async () => {
        changelog = await generateChangeLog(null, pkg, options);
      });

      it('calls out to github to get PR info', () => {
        assert.strictEqual(httpCalls.length, 2);
      });

      it('ignores the PR', () => {
        assert.ok(changelog.includes('* [`1234567`]'));
      });
    });
  });

  describe('emoji', () => {
    const pkg = {
      repository: 'http://127.0.0.1:3000/usr/proj',
    };
    const defaultCommit = {
      sha: '2234567890123456789012345678901234567890',
      subject: 'something',
    };
    const cases = [
      { type: 'feat', expected: '✨ **feat:**' },
      { type: 'fix', expected: '🐛 **fix:**' },
      { type: 'refactor', expected: '📦️ **refactor:**' },
      { type: 'docs', expected: '📝 **docs:**' },
      { type: 'revert', expected: '↩️ **revert:**' },
      { type: 'style', expected: '🎨 **style:**' },
      { type: 'build', expected: '👷 **build:**' },
      { type: 'ci', expected: '💚 **ci:**' },
      { type: 'test', expected: '✅ **test:**' },
      { type: 'perf', expected: '⚡ **perf:**' },
      { type: 'chore', expected: '♻️ **chore:**' },
    ];
    const commits = cases.map(({ type }) => ({ type, ...defaultCommit }));
    const options = {
      commits,
    };
    let changelog;

    it('sets emojis for all commit types', async () => {
      changelog = await generateChangeLog(null, pkg, options);

      cases.forEach(({ expected }) => {
        assert.ok(changelog.includes(expected), `should include ${expected}`);
      });
    });

    it('allows custom emojis with emoji.set config', async () => {
      changelog = await generateChangeLog(null, pkg, {
        ...options,
        emoji: {
          set: {
            feat: '🚀',
          },
        },
      });
      const expected = '🚀 **feat:**';

      assert.ok(changelog.includes(expected), `should include ${expected}`);
    });

    it('disables emojis with emoji.skip config', async () => {
      changelog = await generateChangeLog(null, pkg, {
        ...options,
        emoji: {
          skip: true,
        },
      });
      const notExpected = '📦️';

      assert.ok(
        !changelog.includes(notExpected),
        `should not include ${notExpected}`
      );
    });

    it('adds emoji to breaking changes', async () => {
      changelog = await generateChangeLog(null, pkg, {
        commits: [
          {
            type: 'fix',
            sha: '2234567890123456789012345678901234567890',
            subject: 'something',
            notes: [{ title: 'BREAKING CHANGE', text: 'foo' }],
          },
        ],
      });
      const expected = '#### 💥 Breaking Changes';

      assert.ok(changelog.includes(expected), `should include ${expected}`);
    });
  });
});
