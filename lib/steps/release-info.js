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

const INVALID_COMMITS_MESSAGE = `This repository uses AngularJS Git Commit Message Conventions[1]
to automatically determine the semver implications of changes
and to generate changelogs for releases.

The following commits could not be parsed:

<<COMMITS>>

Most likely they are missing one of the valid type prefixes
(feat, fix, docs, style, refactor, test, chore).

You can reword commit messages using rebase[2]:

~~~bash
git rebase -i <<FIRST_PARENT>>
~~~

[1] Docs on the conventions: http://gr.pn/1OWll98
[2] https://git-scm.com/docs/git-rebase`;

const RELEASE_TYPES = ['none', 'patch', 'minor', 'major'];

function formatInvalidCommit(commit) {
  return `* [${commit.sha.slice(0, 7)}] ${commit.header}`;
}

class InvalidCommitsError extends Error {
  constructor(commits) {
    super();
    // this.captureStackTrace(this, InvalidCommitsError);
    const commitsBlock = commits.map(formatInvalidCommit).join('\n');
    this.message = INVALID_COMMITS_MESSAGE.replace(
      '<<COMMITS>>',
      commitsBlock
    ).replace('<<FIRST_PARENT>>', commits[0].parentSha || '--root');
    this.code = 'EINVALIDCOMMITS';
    this.commits = commits;
  }
}

/**
 * @param {{title: string}} note
 * @return {boolean}
 */
function hasBreakingChange(note) {
  return note.title.startsWith('BREAKING CHANGE');
}

function determineReleaseInfo(commits, acceptInvalidCommits) {
  let releaseType = 0;
  const invalidCommits = [];

  for (let idx = 0; idx < commits.length; ++idx) {
    const commit = commits[idx];

    if ((commit.notes || []).some(hasBreakingChange)) {
      releaseType = 3;
      continue;
    }

    switch (commit.type) {
      case 'chore':
      case 'fix':
      case 'refactor':
      case 'perf':
      case 'revert':
        releaseType = Math.max(releaseType, 1);
        break;

      case 'feat':
        releaseType = Math.max(releaseType, 2);
        break;

      case 'docs':
      case 'style':
      case 'test':
      case 'pr':
        continue;

      default:
        invalidCommits.push(commit);
    }
  }

  if (invalidCommits.length) {
    if (acceptInvalidCommits) {
      // Since we can't tell what those commits actually did,
      // we always treat invalid commits as "major"
      releaseType = 3;
    } else {
      throw new InvalidCommitsError(invalidCommits);
    }
  }

  return RELEASE_TYPES[releaseType];
}

module.exports = determineReleaseInfo;
