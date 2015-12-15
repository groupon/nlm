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

const childProcess = require('child_process');

const Bluebird = require('bluebird');
const commitParser = require('conventional-commits-parser');
const debug = require('debug')('nlm:git:commits');
const _ = require('lodash');

const execFileAsync = Bluebird.promisify(childProcess.execFile);

const SEPARATOR = '---nlm-split---';
const PR_MERGE_PATTERN = /^Merge pull request #(\d+) from ([^/]+)\/([\S]+)/;

function parseCommit(commit) {
  const metaEndIdx = commit.indexOf('\n');
  const meta = commit.slice(0, metaEndIdx).trim().split(' ');
  const message = commit.slice(metaEndIdx + 1);

  const sha = meta.shift();
  const parentSha = meta.shift() || null;

  const data = commitParser.sync(message);
  const prMatch = message.match(PR_MERGE_PATTERN);
  if (prMatch) {
    const prId = prMatch[1];
    data.type = 'pr';
    data.pullId = prId;
    data.references.push({
      action: 'Merges',
      owner: prMatch[2],
      repository: null,
      issue: prId,
      prefix: '#',
      raw: `#${prId}`,
    });
  }
  return _.defaults({ sha, parentSha }, data);
}

function isRandomMerge(commit) {
  // DotCI adds these :(
  return !commit.type && (`${commit.header}`).indexOf('Merge ') === 0;
}

function parseLogOutput(stdout) {
  return _(stdout.split(SEPARATOR))
    .map(line => line.trim())
    .filter()
    .map(parseCommit)
    .reject(isRandomMerge)
    .value();
}

function gracefulEmptyState(error) {
  if (error.message.indexOf('bad default revision \'HEAD\'') !== -1) {
    debug('Assuming this was executed before the first commit was made');
    return [];
  }
  throw error;
}

function createRange(fromRevision) {
  if (fromRevision && fromRevision !== 'v0.0.0') {
    return `${fromRevision}..HEAD`;
  }
  return [];
}

function getCommits(directory, fromRevision) {
  return execFileAsync('git', [
    'log', '--reverse', '--topo-order', `--format=%H %P\n%B${SEPARATOR}`,
  ].concat(createRange(fromRevision)), {
    cwd: directory,
  }).then(parseLogOutput, gracefulEmptyState);
}
module.exports = getCommits;
