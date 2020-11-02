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

const Github = require('../github/client');

const parseRepository = require('../github/parse-repository');

const emojiMaps = new Map([
  [
    'default',
    {
      breaking: '💥',
      feat: '✨',
      fix: '🐛',
      perf: '⚡',
      refactor: '📦️',
      chore: '♻️',
      build: '👷',
      revert: '↩️',
      docs: '📝',
      style: '🎨',
      test: '✅',
      ci: '💚',
    },
  ],
]);

function addPullRequestCommits(pkg, commits, pr) {
  const github = Github.forRepository(pkg.repository);
  return Promise.all([
    github.pull.get(pr.pullId),
    github.pull.commits(pr.pullId),
  ])
    .then(([info, prCommits]) => {
      pr.author = {
        name: info.user.login,
        href: info.user.html_url,
      };
      pr.href = info.html_url;
      pr.title = info.title || info.header;
      const shas = (pr.shas = prCommits.map(c => c.sha));
      pr.commits = commits.filter(commit => shas.includes(commit.sha));
    })
    .catch(err => {
      if (err.statusCode !== 404) throw err; // If the PR doesn't exist, handle it gracefully.

      pr.commits = pr.shas = null;
    });
}

function flatten(arrs) {
  return [].concat.apply([], arrs);
}

function removePRCommits(commits, prs) {
  const prShas = flatten(prs.map(pr => pr.shas));
  return commits.filter(
    commit => commit.type !== 'pr' && !prShas.includes(commit.sha)
  );
}

function extractBreakingChanges(commit) {
  if (!commit.notes || !commit.notes.length) {
    return [];
  }

  return commit.notes
    .filter(n => n.title.startsWith('BREAKING CHANGE'))
    .map(note => {
      return {
        text: note.text,
        commit,
      };
    });
}

function removeInvalidPRs(prs) {
  // Warning: We're doing something evil here and mutate the input array.
  const filtered = prs.filter(pr => {
    return pr.shas && pr.shas.length === pr.commits.length;
  });
  prs.length = filtered.length;
  Object.assign(prs, filtered);
}

function formatReferences(refs) {
  if (!refs || refs.length === 0) {
    return '';
  }

  refs = refs.map(ref => {
    return `[${ref.prefix}${ref.issue}](${ref.href})`;
  });

  return ` - see: ${refs.join(', ')}`;
}

function getCommitLink(repoInfo, commit) {
  const abbr = commit.sha.substr(0, 7);
  const href = [
    repoInfo.htmlBase,
    repoInfo.username,
    repoInfo.repository,
    'commit',
    commit.sha,
  ].join('/');
  return `[\`${abbr}\`](${href})`;
}

function formatBreakingChange(change, repoInfo) {
  return `${change.text}\n\n*See: ${getCommitLink(repoInfo, change.commit)}*`;
}

function prependBreakingChanges(data, commits, pkg, options) {
  const { emoji } = options;
  const breaking = flatten(commits.map(extractBreakingChanges));
  if (!breaking.length) {
    return data;
  }

  let emojiSet = {};
  if (!emoji.skip) {
    emojiSet = { ...emojiMaps.get('default'), ...(emoji.set || {}) };
  }

  const repoInfo = parseRepository(pkg.repository);
  const breakingChanges = breaking
    .map(change => formatBreakingChange(change, repoInfo))
    .join('\n\n');

  return [
    `#### ${!emoji.skip ? `${emojiSet['breaking']} ` : ''}Breaking Changes

${breakingChanges}

#### Commits
`,
  ].concat(data);
}

function formatCommit(commit) {
  let subject;

  if (commit.type) {
    subject = `${commit.type}: ${commit.subject}`;
  } else {
    subject = commit.header;
  }

  return `${getCommitLink(commit)} ${subject}${formatReferences(
    commit.references
  )}`;
}

function formatPR(pr, options) {
  const { nlmOptions = {} } = options;
  const changes =
    nlmOptions.changelog && nlmOptions.changelog.verbose
      ? pr.commits.map(formatCommit).map(line => {
          return `  - ${line}`;
        })
      : [];

  const titleLine = `[#${pr.pullId}](${pr.href}) ${pr.title} ([@${pr.author.name}](${pr.author.href})) `;

  return [titleLine].concat(changes).join('\n');
}

function formatCommits(rawPRs, rawCommits, options) {
  const orphansCommits = rawCommits.map(formatCommit);
  const changes = rawPRs
    .map(pr => formatPR(pr, options))
    .concat(orphansCommits)
    .map(line => {
      return `* ${line}`;
    });
  return changes;
}

async function generateChangeLog(cwd, pkg, options) {
  const { commits } = options;

  const prs = commits.filter(c => c.type === 'pr');

  for (const pr of prs) {
    await addPullRequestCommits(pkg, commits, pr);
  }

  removeInvalidPRs(prs);

  const cleanedCommits = removePRCommits(commits, prs);
  const data = formatCommits(prs, cleanedCommits, options);
  const rawChangelog = prependBreakingChanges(data, commits, pkg, options);

  options.changelog = rawChangelog.join('\n');

  return options.changelog;
}

module.exports = generateChangeLog;
