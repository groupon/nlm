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

const getCommits = require('../../lib/git/commits');

const determineReleaseInfo = require('../../lib/steps/release-info');

const withFixture = require('../fixture');

describe('determineReleaseInfo', () => {
  it('returns "none" for an empty list of commits', () => {
    assert.equal('none', determineReleaseInfo([]));
  });

  describe('with invalid commit messages', () => {
    const dirname = withFixture('invalid-commit');
    let commits = [];
    before('load commits', async () => {
      commits = await getCommits(dirname);
    });

    it('rejects them with a helpful message', () => {
      const error = assert.throws(() => {
        determineReleaseInfo(commits);
      });
      assert.equal(
        `This repository uses AngularJS Git Commit Message Conventions[1]
to automatically determine the semver implications of changes
and to generate changelogs for releases.

The following commits could not be parsed:

* [${commits[0].sha.slice(0, 7)}] This ain't no valid commit message
* [${commits[1].sha.slice(0, 7)}] bogus: Not an acceptable commit type

Most likely they are missing one of the valid type prefixes
(feat, fix, docs, style, refactor, test, chore).

You can reword commit messages using rebase[2]:

~~~bash
git rebase -i --root
~~~

[1] Docs on the conventions: http://gr.pn/1OWll98
[2] https://git-scm.com/docs/git-rebase`,
        error.message
      );
    });

    describe('with --acceptInvalidCommits', () => {
      it('is cautious and considers it "major"', () => {
        assert.equal('major', determineReleaseInfo(commits, true));
      });
    });
  });

  const testcases = [
    {
      desc: 'with "chore", "fix", "refactor", "build" & "perf" commit type',
      fixture: 'patch-commits',
      expected: 'patch',
    },
    {
      desc: 'with "feat" commit type',
      fixture: 'minor-commits',
      expected: 'minor',
    },
    {
      desc: 'with "docs", "style", "test", "ci" & "pr" commit type',
      fixture: 'silent-commits',
      expected: 'none',
    },
    {
      desc: 'with "BREAKING CHANGE" commit footer',
      fixture: 'breaking-change-commit',
      expected: 'major',
    },
    {
      desc: 'with github "Revert" commit message or "revert" commit type',
      fixture: 'revert-commit',
      expected: 'patch',
    },
    {
      desc: 'with github "Merge" commit message',
      fixture: 'merge-commit',
      expected: 'none',
    },
  ];

  describe('test cases', () => {
    for (const testcase of testcases) {
      describe(testcase.desc, () => {
        const dirname = withFixture(testcase.fixture);
        let commits = [];
        before('load commits', async () => {
          commits = await getCommits(dirname);
        });

        it(`returns "${testcase.expected}" version info`, () => {
          assert.equal(testcase.expected, determineReleaseInfo(commits));
        });
      });
    }
  });
});
