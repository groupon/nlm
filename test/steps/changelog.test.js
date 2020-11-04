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
        title: 'feat: PR #1 Title',
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

function assertEntries(changelog, expected) {
  const lines = Array.isArray(changelog) ? changelog : changelog.split('\n');

  return expected.map(entry => {
    const index = lines.findIndex(i => i === entry);
    assert.ok(index !== -1, expected);
    return index;
  });
}

describe('generateChangeLog', () => {
  const defaultOptions = {
    nlmOptions: {
      emoji: {
        skip: true,
      },
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

    const expectedEntries = [
      `* [\`1234567\`](${href0}) fix: Stop doing the wrong thing - see: [fo/ba#7](https://gitub.com/fo/ba/issues/7)`,
      `* [\`2234567\`](${href1}) feat: Do more things - see: [THING-2010](https://example.com/browse/THING-7), [#44](https://github.com/usr/proj/issues/44)`,
    ];
    const indices = assertEntries(changelog, expectedEntries);
    const lines = changelog.split('\n');

    assert.strictEqual(lines[indices[0] - 2], '#### Bug Fixes');
    assert.strictEqual(lines[indices[1] - 2], '#### New Features');
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

    const expectedEntries = [
      `* [\`1234567\`](${href0}) fix: Stop doing the wrong thing`,
      `* [\`2234567\`](${href1}) feat: Do more things`,
    ];
    assertEntries(changelog, expectedEntries);
  });

  it('omits commit types from changelog when specificed in nlm changelog options', async () => {
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
      commits,
      nlmOptions: {
        changelog: {
          omit: ['fix'],
        },
        emoji: {
          skip: true,
        },
      },
    };

    const changelog = await generateChangeLog(null, pkg, options);

    assert.ok(!changelog.includes('[`1234567`]'));
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

    const expected = [
      '#### Breaking Changes',
      '',
      'The interface of this library changed in some way.',
      '',
      `*See: [\`2234567\`](${href1})*`,
      '',
    ].join('\n');

    const expectedEntries = [
      `* [\`1234567\`](${href0}) fix: Stop doing the wrong thing`,
      `* [\`2234567\`](${href1}) feat: Do more things`,
    ];

    const changelog = await generateChangeLog(null, pkg, options);

    assert.ok(changelog.startsWith(expected));
    assertEntries(changelog, expectedEntries);
  });

  it('handles variants typings of BREAKING CHANGE', async () => {
    const pkg = {
      repository: 'usr/proj',
    };
    const defaultCommit = {
      sha: '2234567890123456789012345678901234567890',
      type: 'feat',
      subject: 'Do more things',
    };
    const testCases = [
      {
        title: 'BREAKING CHANGE',
        text: 'without a colon',
      },
      {
        title: 'BREAKING CHANGE:',
        text: 'with a colon',
      },
      {
        title: 'BREAKING CHANGES',
        text: 'plural',
      },
      {
        title: 'BREAKING CHANGES:',
        text: 'plural with colon',
      },
    ];

    for (const commitNote of testCases) {
      const commit = { ...defaultCommit, notes: [commitNote] };
      const href0 = `https://github.com/usr/proj/commit/${commit.sha}`;

      const expected = [
        '#### Breaking Changes',
        '',
        commit.notes.map(note => note.text).join('\n'),
        '',
        `*See: [\`2234567\`](${href0})*`,
        '',
      ].join('\n');

      const changelog = await generateChangeLog(null, pkg, {
        ...defaultOptions,
        commits: [commit],
      });

      assert.ok(changelog.startsWith(expected));

      assertEntries(changelog, [
        `* [\`2234567\`](${href0}) feat: Do more things`,
      ]);
    }
  });

  describe('PRs', () => {
    describe('pull request commits', () => {
      const pkg = {
        repository: 'http://127.0.0.1:3000/usr/proj',
      };
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

      it('omits commits by pull request by default', async () => {
        changelog = await generateChangeLog(null, pkg, options);

        assert.ok(changelog.includes('[#1](http://pr-1) feat: PR #1 Title'));
        assert.ok(
          !changelog.includes('  - [`1234567`] fix: Stop doing the wrong thing')
        );
      });

      describe('with changelog.verbose flag', () => {
        const verboseOpts = {
          nlmOptions: { changelog: { verbose: true } },
        };
        it('groups commits by pull request with changelog.verbose flag', async () => {
          changelog = await generateChangeLog(null, pkg, {
            ...options,
            ...verboseOpts,
          });

          assert.ok(changelog.includes('[#1](http://pr-1) feat: PR #1 Title'));
          assert.ok(changelog.includes('  - [`1234567`]'));
        });

        it("doesn't add emojis to pull commits", async () => {
          changelog = await generateChangeLog(null, pkg, {
            ...options,
            nlmOptions: {
              changelog: { verbose: true },
              emoji: {
                skip: false,
              },
            },
          });

          assert.ok(changelog.includes(') fix: Stop'));
        });
      });
    });

    describe('with a PR w/o associated commits)', () => {
      const pkg = {
        repository: 'http://127.0.0.1:3000/usr/proj',
      };
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

      // sloppyCommits lack "type" property
      const sloppyCommits = commits.map(commit => {
        return commit.type === 'pr'
          ? commit
          : {
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

      it('ignores the PR w/o associated commits', () => {
        assert.ok(!changelog.includes('* [#2] PR #2 Title'));
        assert.ok(changelog.includes('* [`1234567`]'));
      });

      it('handles poorly formatted commit messages too', () => {
        assert.ok(sloppyChangelog.includes(') Stop doing the wrong thing\n'));
        assert.ok(sloppyChangelog.includes(') Do more things'));
      });

      it('categorizes commits w/o angular prefix as "Internal"', () => {
        assert.ok(
          sloppyChangelog.startsWith('#### Internal'),
          'sets "Internal" category'
        );
      });
    });

    describe('with a PR missing in GH', () => {
      const pkg = {
        repository: 'http://127.0.0.1:3000/usr/proj',
      };
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
          // this PR is missing - see missing mocks at the beginning of this file
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
        assert.ok(!changelog.includes('Merge PR #3'));
      });
    });

    describe('categorization', () => {
      withFakeGithub();
      const pkg = {
        repository: 'usr/proj',
      };
      const defaultCommit = {
        sha: '1234567890123456789012345678901234567890',
        subject: 'Stop doing the wrong thing',
      };
      const headlineLevel = '####';

      const testCases = [
        { headline: 'New Features', prefixes: ['feat'] },
        { headline: 'Code Refactoring', prefixes: ['refactor'] },
        { headline: 'Bug Fixes', prefixes: ['fix'] },
        { headline: 'Performance Improvements', prefixes: ['perf'] },
        { headline: 'Dependencies', prefixes: ['dep'] },
        { headline: 'Documentation', prefixes: ['docs'] },
        { headline: 'Polish', prefixes: ['style'] },
        { headline: 'Reverts', prefixes: ['revert'] },
        {
          headline: 'Internal',
          prefixes: ['ci', 'test', 'build', 'chore'],
        },
      ];

      const href0 = `https://github.com/usr/proj/commit/${defaultCommit.sha}`;

      it('sorts commits into according categories', async () => {
        for (const { headline, prefixes } of testCases) {
          for (const prefix of prefixes) {
            const options = {
              nlmOptions: {
                emoji: {
                  skip: true,
                },
              },
              commits: [{ ...defaultCommit, type: prefix }],
            };

            const expectedEntries = [
              `* [\`1234567\`](${href0}) ${prefix}: Stop doing the wrong thing`,
            ];

            const changelog = await generateChangeLog(null, pkg, options);
            const lines = changelog.split('\n');

            const indices = assertEntries(changelog, expectedEntries);
            assert.strictEqual(
              lines[indices[0] - 2],
              `${headlineLevel} ${headline}`
            );
          }
        }
      });

      it('adds category emojis to each category', async () => {
        const emojiMaps = generateChangeLog.emojiMaps.get('babel');
        for (const { headline, prefixes } of testCases) {
          for (const prefix of prefixes) {
            const options = {
              commits: [{ ...defaultCommit, type: prefix }],
            };

            const expectedEntries = [
              `* [\`1234567\`](${href0}) ${prefix}: Stop doing the wrong thing`,
            ];

            const changelog = await generateChangeLog(null, pkg, options);
            const lines = changelog.split('\n');

            const indices = assertEntries(changelog, expectedEntries);
            assert.strictEqual(
              lines[indices[0] - 2],
              `${headlineLevel} ${
                emojiMaps[prefix] || emojiMaps['internal']
              } ${headline}`
            );
          }
        }
      });

      it('identifies & highlights dependency updates in commit subject and groups them into "Dependencies" category', async () => {
        function removeBackticks(str) {
          return str.replace(/`/g, '');
        }

        const subjectCases = [
          '@grpn/create@23.0',
          '@grpn/create@23.0.0',
          ['@grpn/create@23.0.x', '`create@23.0.x`', '`create@23x`'], // multiple packages in subject
          '@grpn/cr.eate@23.x',
          'create@23.x',
          'cre.ate@23',
          'cre.ate@v23',
          'cre.ate v23',
          'cre.ate 23',
          '`cre.ate 23`',
        ];

        for (const subject of subjectCases) {
          const commits = [
            {
              sha: '1234567890123456789012345678901234567890',
              type: 'fix',
              subject: Array.isArray(subject) ? subject.join(' ') : subject,
            },
          ];
          const options = {
            ...defaultOptions,
            commits,
          };
          const href = `https://github.com/usr/proj/commit/${commits[0].sha}`;
          const expectedEntries = [
            `* [\`1234567\`](${href}) fix: \`${
              Array.isArray(subject)
                ? subject.map(removeBackticks).join('` `')
                : removeBackticks(subject)
            }\``,
          ];

          const changelog = await generateChangeLog(
            null,
            pkg,
            options
          ).then(res => res.split('\n'));

          const index = assertEntries(changelog, expectedEntries);
          assert.strictEqual(changelog[index - 2], '#### Dependencies');
        }
      });
    });
  });

  describe('Emojis', () => {
    let changelog;
    const pkg = {
      repository: 'http://127.0.0.1:3000/usr/proj',
    };
    const defaultCommit = {
      sha: '2234567890123456789012345678901234567890',
      subject: 'something',
    };
    const cases = [
      { type: 'feat' },
      { type: 'fix' },
      { type: 'refactor' },
      { type: 'docs' },
      { type: 'revert' },
      { type: 'style' },
      { type: 'build' },
      { type: 'ci' },
      { type: 'test' },
      { type: 'perf' },
      { type: 'chore' },
    ];
    const commits = cases.map(({ type }) => ({ type, ...defaultCommit }));
    const options = {
      commits,
      nlmOptions: {
        changelog: {
          verbose: true,
        },
      },
    };

    it('disables emojis with emoji.skip config', async () => {
      changelog = await generateChangeLog(null, pkg, {
        ...options,
        nlmOptions: {
          ...options.nlmOptions,
          emoji: {
            skip: true,
          },
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
