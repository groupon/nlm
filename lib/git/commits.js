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

const commitParser = require('conventional-commits-parser');
const semver = require('semver');

const debug = require('debug')('nlm:git:commits');

const run = require('../run');

const SEPARATOR = '---nlm-split---';
const PR_MERGE_PATTERN = /^Merge pull request #(\d+) from ([^\/]+)\/([\S]+)/;

const EMPTY_STATE_MESSAGE =
  /bad default revision 'HEAD'|does not have any commits yet/;

function gracefulEmptyState(error) {
  if (EMPTY_STATE_MESSAGE.test(error.message)) {
    debug('Assuming this was executed before the first commit was made');
    return '';
  }

  throw error;
}

/**
 * @param {string} commitSection
 * @returns {{parentSha: string|null, sha: string|null, type: string|null, revert?: {message: string}, header: string|null, pullId: number|null}}
 */
function parseCommit(commitSection) {
  const [sha, parentSha, , ...body] = commitSection.split('\n');
  const message = body.join('\n');

  const data = commitParser.sync(message, {
    issuePrefixes: ['#', 'https?://[\\w\\.-/]*[-/]+'],
    revertPattern: /^revert:?\s"([\s\S]*)"/i,
    revertCorrespondence: ['message'],
  });
  const prMatch = message.match(PR_MERGE_PATTERN);

  if (data.revert) {
    data.type = 'pr';
    data.subject = data.revert.message;
    data.header = data.header.replace(/^Revert /, 'revert: ');
  }

  if (prMatch) {
    const prId = prMatch[1];
    data.type = 'pr';
    data.pullId = prId;
    const mergeRef = data.references.find(ref => {
      return ref.issue === prId;
    });

    if (!mergeRef) {
      throw new Error(`Couldn't find reference to merge of PR #${prId}`);
    }

    Object.assign(mergeRef, {
      action: 'Merges',
      owner: prMatch[2],
    });

    if (!mergeRef.repository) {
      mergeRef.repository = null;
    }
  }

  return { ...data, sha: sha || data.sha, parentSha: parentSha || null };
}

/**
 * @param {{type?: string, header?:string}} commit
 * @returns {boolean}
 */
function isNotRandomMerge(commit) {
  // DotCI adds these :(
  return commit.type || `${commit.header}`.indexOf('Merge ') !== 0;
}

/**
 * Get only relevant commits
 * If a tag exist, only commits newer than the tag are returned,
 * otherwise all
 *
 * @param {string[]} sections
 * @returns {string[]}
 */
function findRelevant(sections) {
  const index = sections.findIndex(section => {
    // check for version tags i.e v10.3.0 that are at the beginning of the raw body
    const match = section.match(/\n(v\d+\.\d+\.\d+)/);
    return match && semver.valid(match[1]);
  });
  if (index > -1) {
    sections = sections.slice(0, index);
  }

  return sections.filter(section => section.trim());
}

/**
 * @param {string} stdout
 * @returns {string[]}
 */
function parseLogOutput(stdout) {
  const sections = findRelevant(stdout.split(SEPARATOR));

  return sections.reduceRight((acc, commitSection) => {
    const commit = parseCommit(commitSection.trim());
    if (isNotRandomMerge(commit)) {
      acc.push(commit);
    }
    return acc;
  }, []);
}

/**
 * @param {string} cwd
 * @returns {Promise<string>}
 */
async function getRemoteBranch(cwd) {
  try {
    const remoteData = await run('git', ['remote', 'show', 'origin'], {
      cwd,
      showStdout: false,
    });
    const match = remoteData.match(/HEAD branch: (\w+)/);
    if (match) {
      return `origin/${match[1]}`;
    }
  } catch (e) {
    /* This might fail in CI / tests - we can use `git status -sb` instead*/
  }

  // Show the branch and tracking info even in short-format
  const stdout = await run('git', ['status', '-sb'], { cwd }).catch(() => '');

  // i.e. ## tagging...origin/main
  const match = stdout.match(/#{2} [\w-]+\.{3}(\w+\/[\w-.\/]+)/);
  return match ? match[1] : '';
}

/**
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
async function getCommits(cwd) {
  const remote = await getRemoteBranch(cwd);
  const range = remote ? `${remote}...HEAD` : [];

  debug('range', range);

  // https://devhints.io/git-log-format
  // %H - commit hash
  // %P - parent hash
  // %D - refs
  // %B - raw body
  const logArgs = [
    'log',
    '--topo-order',
    `--format=%H\n%P\n%D\n%B${SEPARATOR}`,
  ];

  // get local commits
  const stdout = await run('git', logArgs.concat(range), { cwd }).catch(err =>
    gracefulEmptyState(err)
  );

  return parseLogOutput(stdout);
}

module.exports = getCommits;
