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

const withFixture = require('../fixture');

describe('getCommits', () => {
  describe('with an empty project', () => {
    const dirname = withFixture('empty-project');

    it('returns an empty list', () =>
      getCommits(dirname)
        .then(commits => assert.deepEqual([], commits)));
  });

  describe('with invalid commits', () => {
    const dirname = withFixture('invalid-commit');

    it('returns the commit with type=null', () =>
      getCommits(dirname)
        .then(commits => {
          assert.equal(2, commits.length);
          assert.equal(null, commits[0].type);
          assert.equal('This ain\'t no valid commit message', commits[0].header);
          assert.equal('bogus', commits[1].type);
        }));
  });

  describe('with multiple commits', () => {
    const dirname = withFixture('multiple-commits');
    let allCommits = null;

    before('fetch al commits', () =>
      getCommits(dirname).then(commits => allCommits = commits));

    it('returns all three commits, plus one merge commit', () => {
      assert.equal(4, allCommits.length);
    });

    it('returns commits in order', () => {
      assert.equal('Do stuff', allCommits[0].subject);
      assert.equal('Adding second', allCommits[1].subject);
      assert.equal('Changed more stuff', allCommits[2].subject);
    });

    it('includes parentSha', () => {
      assert.equal('is null for first commit',
        null, allCommits[0].parentSha);
      assert.equal('points to the immediate parent for other commits',
        allCommits[0].sha, allCommits[1].parentSha);
    });

    it('includes notes for breaking changes', () => {
      const note = allCommits[1].notes[0];
      assert.equal('BREAKING CHANGE', note.title);
      assert.equal(`
Users expecting only one file might run into problems

It should be as easy as migrating the \`1\` to a \`2\`.
      `.trim(), note.text);
    });

    it('includes merge commit info', () => {
      const merge = allCommits[3];
      assert.equal(merge.type, 'pr');
      assert.equal(merge.references[0].action, 'Merges');
      assert.equal(merge.references[0].issue, '119');
    });

    describe('when starting from v0.0.0', () => {
      it('returns everything from the beginning', () =>
        getCommits(dirname, 'v0.0.0')
          .then(commits => assert.equal(allCommits.length, commits.length)));
    });

    describe('when starting from the first commit', () => {
      it('only returns the last two', () =>
        getCommits(dirname, allCommits[0].sha)
          .then(commits => {
            assert.deepEqual(allCommits.slice(1), commits);
          }));
    });
  });
});
