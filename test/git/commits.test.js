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

const getCommits = require('../../lib/git/commits');

const withFixture = require('../fixture');

describe('getCommits', () => {
  describe('with an empty project', () => {
    const dirname = withFixture('empty-project');

    it('returns an empty list', async () => {
      const commits = await getCommits(dirname);

      assert.deepStrictEqual(commits, []);
    });
  });

  describe('with invalid commits', () => {
    const dirname = withFixture('invalid-commit');

    it('returns the commit with type=null', async () => {
      const commits = await getCommits(dirname);

      assert.strictEqual(commits.length, 2);
      assert.strictEqual(commits[0].type, null);
      assert.strictEqual(
        commits[0].header,
        "This ain't no valid commit message"
      );
      assert.strictEqual(commits[1].type, 'bogus');
    });
  });

  describe('issue and ticket links', () => {
    const dirname = withFixture('ticket-commits');
    let allCommits = null;

    function assertIssue(subject, expected) {
      const commit = allCommits.find(c => c.subject === subject);
      assert.strictEqual(commit.references.length, expected.refLength);

      const ref = commit.references[0];
      assert.strictEqual(ref.owner, expected.owner);
      assert.strictEqual(ref.repository, expected.repository);
      assert.strictEqual(ref.issue, expected.issue);
      assert.strictEqual(ref.raw, expected.raw);
      if ('prefix' in expected) {
        assert.strictEqual(ref.prefix, expected.prefix);
      }
    }

    before('fetch al commits', () => {
      return getCommits(dirname).then(commits => {
        allCommits = commits;
      });
    });

    it('includes links to github for #123 style', () => {
      const expected = {
        refLength: 1,
        owner: null,
        repository: null,
        issue: '42',
        prefix: '#',
        raw: '#42',
      };

      assertIssue('Short', expected);
    });

    it('includes links to github for x/y#123 style', () => {
      const expected = {
        refLength: 1,
        owner: 'riley',
        repository: 'thing',
        issue: '13',
        prefix: '#',
        raw: 'riley/thing#13',
      };

      assertIssue('Repo', expected);
    });

    it('includes links to github for full public github urls', () => {
      const expected = {
        refLength: 1,
        owner: null,
        repository: null,
        issue: '13',
        raw: 'https://github.com/open/source/issues/13',
      };

      assertIssue('Full', expected);
    });

    it('includes links to github for full GHE urls', () => {
      const expected = {
        refLength: 1,
        owner: null,
        repository: null,
        issue: '72',
        raw: 'https://github.example.com/some/thing/issues/72',
      };

      assertIssue('GHE', expected);
    });

    it('includes links to jira', () => {
      const expected = {
        refLength: 1,
        owner: null,
        repository: null,
        issue: '2001',
        raw: 'https://jira.atlassian.com/browse/REPO-2001',
      };

      assertIssue('Jira', expected);
    });
  });

  describe('with multiple commits', () => {
    const dirname = withFixture('multiple-commits');
    let allCommits = null;

    before('fetches all commits', () => {
      return getCommits(dirname).then(commits => {
        allCommits = commits;
      });
    });

    it('returns all three commits, plus one merge commit', () => {
      assert.strictEqual(allCommits.length, 4);
    });

    it('returns commits in order', () => {
      assert.strictEqual(allCommits[0].subject, 'Do stuff');
      assert.strictEqual(allCommits[1].subject, 'Adding second');
      assert.strictEqual(allCommits[2].subject, 'Changed more stuff');
    });

    it('includes parentSha', () => {
      assert.strictEqual(
        allCommits[0].parentSha,
        null,
        'is null for first commit'
      );
      assert.strictEqual(
        allCommits[1].parentSha,
        allCommits[0].sha,
        'points to the immediate parent for other commits'
      );
    });

    it('includes notes for breaking changes', () => {
      const note = allCommits[1].notes[0];

      assert.strictEqual(note.title, 'BREAKING CHANGE');
      assert.strictEqual(
        note.text,
        [
          'Users expecting only one file might run into problems',
          '',
          'It should be as easy as migrating the `1` to a `2`.',
        ].join('\n')
      );
    });

    it('includes merge commit info', () => {
      const merge = allCommits[3];

      assert.strictEqual('pr', merge.type);
      assert.strictEqual('Merges', merge.references[0].action);
      assert.strictEqual('119', merge.references[0].issue);
    });
  });
});
