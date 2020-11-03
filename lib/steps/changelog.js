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

/**
 * @typedef PR
 * @property {number} pullId
 * @property {{name: string, href: string}} author
 * @property {string} href
 * @property {string} title
 * @property {string[]} shas
 * @property {Commit[]} commits
 */

/**
 * @typedef Commit
 * @extends PR
 * @property {string} type
 * @property {string} header
 * @property {string} subject
 * @property {string} sha
 * @property {{title: string, text:string}[]} notes
 * @property {{prefix: string, issue: number, href: string}[]} references
 */

/**
 * @typedef RepoInfo
 * @property {string} htmlBase
 * @property {string} username
 * @property {string} repository
 */

/**
 * @typedef NlmOptions
 * @property {{skip?: boolean, set: {[key: string]: string}}} emoji
 * @property {{verbose?: boolean}} changelog
 */

const Github = require('../github/client');

const parseRepository = require('../github/parse-repository');

const DEP_REGEXP = /[@\w\/-_.]+[@\s]v?\d+[0-9x.]+/im;

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
  [
    'babel',
    {
      breaking: '💥',
      feat: '🚀',
      fix: '🐛',
      perf: '⚡',
      refactor: '📦️',
      revert: '↩️',
      docs: '📝',
      style: '💅',
      deps: '🔼',
      internal: '🏡',
    },
  ],
]);

/**
 * @param {string} type
 * @param {{nlmOptions?: NlmOptions}} options
 * @return {string}
 */
function getTypeCategory(type, options) {
  const { nlmOptions = {} } = options;
  const { emoji: emojiOpts = {} } = nlmOptions;

  let descr;
  const headlineLevel = '####';

  switch (type) {
    case 'breaking':
      descr = 'Breaking Changes';
      break;

    case 'feat':
      descr = 'New Features';
      break;

    case 'perf':
      descr = 'Performance Improvements';
      break;

    case 'refactor':
      descr = 'Code Refactoring';
      break;

    case 'fix':
      descr = 'Bug Fixes';
      break;

    case 'dep':
      descr = 'Dependencies';
      break;

    case 'revert':
      descr = 'Reverts';
      break;

    case 'docs':
      descr = 'Documentation';
      break;

    case 'style':
      descr = 'Polish';
      break;

    default:
      descr = 'Internal';
  }

  const emojiSet = { ...emojiMaps.get('babel'), ...(emojiOpts.set || {}) };
  const emoji = !emojiOpts.skip ? emojiSet[type] || emojiSet['internal'] : '';

  return (emoji ? [headlineLevel, emoji, descr] : [headlineLevel, descr]).join(
    ' '
  );
}

/**
 * @param {*[]} data
 * @return {*[]}
 */
function sortByType(data) {
  if (!data.length) {
    return [];
  }

  const sorted = [];
  [
    'breaking',
    'feat',
    'perf',
    'refactor',
    'fix',
    'dep',
    'revert',
    'style',
    'docs',
  ].forEach(type => {
    data = data.reduce((acc, entry) => {
      if (entry[0] === type) {
        sorted.push(entry);
      } else {
        acc.push(entry);
      }
      return acc;
    }, []);
  });

  return sorted.concat(data);
}

/**
 * @param {string} title
 * @return {string}
 */
function getType(title) {
  const match = title.match(/^(\w+):/);
  let type = match && match[1];
  if (findDependency(title)) {
    type = 'dep';
  }
  return type || 'internal';
}

/**
 * @param {String} str
 * @return {RegExpMatchArray|null}
 */
function findDependency(str) {
  return str.match(DEP_REGEXP);
}

/**
 *
 * @param {Object} github
 * @param {Commit[]} commits
 * @param {PR} pr
 * @return {Promise<void>}
 */
function addPullRequestCommits(github, commits, pr) {
  pr.commits = null;
  pr.shas = null;

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
      pr.shas = prCommits.map(c => c.sha);
      pr.commits = commits.filter(commit => pr.shas.includes(commit.sha));
    })
    .catch(err => {
      if (err.statusCode !== 404) throw err; // If the PR doesn't exist, handle it gracefully.
    });
}

/**
 * @param {*[]} arrs
 * @return {*[]}
 */
function flatten(arrs) {
  return [].concat.apply([], arrs);
}

/**
 * @param {PR[]} prs
 * @param {Commit[]} commits
 * @return {*[]|Commit[]}
 */
function removePRCommits(prs, commits) {
  const prShas = flatten(prs.map(pr => pr.shas));
  return commits.filter(
    commit => commit.type !== 'pr' && !prShas.includes(commit.sha)
  );
}

/**
 * @param {Commit} commit
 * @return {*[]|{commit: Commit, text: string}[]}
 */
function extractBreakingChanges(commit) {
  if (!(commit.notes && commit.notes.length)) {
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

/**
 * @param {PR[]} prs
 */
function removeInvalidPRs(prs) {
  // Warning: We're doing something evil here and mutate the input array.
  const filtered = prs.filter(pr => {
    return pr.shas && pr.shas.length === pr.commits.length;
  });
  prs.length = filtered.length;
  Object.assign(prs, filtered);
}

/**
 * @param {{prefix: string, issue: number, href: string}[]} refs
 * @return {string}
 */
function formatReferences(refs) {
  if (!refs || refs.length === 0) {
    return '';
  }

  const references = refs.map(ref => {
    return `[${ref.prefix}${ref.issue}](${ref.href})`;
  });

  return ` - see: ${references.join(', ')}`;
}

/**
 * @param {Commit} commit
 * @param {RepoInfo} repoInfo
 * @return {string}
 */
function getCommitLink(commit, repoInfo) {
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

/**
 * @param {{text: string, commit: Commit}} change
 * @param {RepoInfo} repoInfo
 * @return {string}
 */
function formatBreakingChange(change, repoInfo) {
  return `${change.text}\n\n*See: ${getCommitLink(change.commit, repoInfo)}*`;
}

/**
 * @param {Commit[]} commits
 * @param {{nlmOptions?: NlmOptions}} options}} options
 * @param {RepoInfo} repoInfo
 * @return {*[]|(string)[][]}
 */
function getBreakingChanges(commits, options, repoInfo) {
  const breaking = flatten(commits.map(extractBreakingChanges));
  if (!breaking.length) {
    return [];
  }

  const breakingChanges = breaking
    .map(change => formatBreakingChange(change, repoInfo))
    .join('\n\n');

  return [['breaking', breakingChanges]];
}

/**
 * @param {Commit} commit
 * @param {RepoInfo} repoInfo
 * @return {string}
 */
function formatCommit(commit, repoInfo) {
  let subject;

  if (commit.type) {
    subject = `${commit.type}: ${commit.subject}`;
  } else {
    subject = commit.header;
  }

  return `${getCommitLink(commit, repoInfo)} ${subject}${formatReferences(
    commit.references
  )}`;
}

/**
 * @param {PR} pr
 * @param {{nlmOptions?: NlmOptions}} options
 * @param {RepoInfo} repoInfo
 * @return {string}
 */
function formatPR(pr, options, repoInfo) {
  const { nlmOptions = {} } = options;
  const changes =
    nlmOptions.changelog && nlmOptions.changelog.verbose
      ? pr.commits.map(commit => {
          return `  - ${formatCommit(commit, repoInfo)}`;
        })
      : [];

  const titleLine = `[#${pr.pullId}](${pr.href}) ${pr.title} ([@${pr.author.name}](${pr.author.href})) `;

  return [titleLine].concat(changes).join('\n');
}

/**
 * @param {PR[]} rawPRs
 * @param {Commit[]} rawCommits
 * @param {{nlmOptions?: NlmOptions}} options
 * @param {RepoInfo} repoInfo
 * @return {*[]|[string, string][]}
 */
function format(rawPRs, rawCommits, options, repoInfo) {
  const orphansCommits = rawCommits.map(commit => [
    getType(`${commit.type}: ${commit.subject}`),
    formatCommit(commit, repoInfo),
  ]);

  return rawPRs
    .map(pr => [getType(pr.title), formatPR(pr, options, repoInfo)])
    .concat(orphansCommits)
    .map(([type, line]) => [type, `* ${line}`]);
}

/**
 * @param {[string, string][]|*[]} data
 * @param {{nlmOptions?: NlmOptions}} options
 * @return {string}
 */
function mergeChangelog(data, options) {
  const changelog = new Map();
  const sorted = sortByType(data);

  for (const [type, entry] of sorted) {
    const category = getTypeCategory(type, options);
    if (!changelog.has(category)) {
      changelog.set(category, [entry]);
    } else {
      changelog.set(category, changelog.get(category).concat(entry));
    }
  }
  return [...changelog]
    .map(([headline, entries]) => `${headline}\n\n${entries.join('\n')}`)
    .join('\n\n');
}

/**
 * @param {*} cwd
 * @param {{repository: string|{url: string}}} pkg
 * @param {{commits: Commit[], nlmOptions?: NlmOptions, changelog?: string}} options
 * @return {Promise<string>}
 */
async function generateChangeLog(cwd, pkg, options) {
  const { commits } = options;
  const repoInfo = parseRepository(pkg.repository);
  const github = Github.forRepository(pkg.repository);

  /** @type {PR[]} */
  const prs = commits.filter(c => c.type === 'pr');

  // step1: fetch PR commits data from GH & match with commits
  for (const pr of prs) {
    await addPullRequestCommits(github, commits, pr);
  }

  // step2: remove PRs without commits
  removeInvalidPRs(prs);

  // step3: remove commits of type `pr`
  const cleanedCommits = removePRCommits(prs, commits);

  // step4: generate PRs / commits changelog entries
  const data = format(prs, cleanedCommits, options, repoInfo);

  // step5: scan commits for breaking changes
  const breakingChanges = getBreakingChanges(commits, options, repoInfo);

  // step6: build changelog
  options.changelog = mergeChangelog(breakingChanges.concat(data), options);

  return options.changelog;
}

generateChangeLog.emojiMaps = emojiMaps;
module.exports = generateChangeLog;
