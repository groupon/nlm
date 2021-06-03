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

const fs = require('fs');

const path = require('path');

const console = require('console');

const semver = require('semver');

const addLicenseHeaders = require('../license');

const verifyClean = require('../git/verify-clean');

const ensureTag = require('../git/ensure-tag');

const determineReleaseInfo = require('../steps/release-info');

const tagPullRequest = require('../steps/tag-pr');

const getPendingChanges = require('../steps/pending-changes');

const detectBranch = require('../steps/detect-branch');

function verifyLicenseHeaders(cwd, pkg, options) {
  const whitelist = (options.license && options.license.files) || pkg.files;
  const exclude = options.license && options.license.exclude;
  return addLicenseHeaders(cwd, whitelist, exclude);
}

function getPullRequestId() {
  const ENV_VARS = new Set([
    'DOTCI_PULL_REQUEST', // DotCI
    'GITHUB_PULL_REQUEST', // GRPN Jenkins
    'ghprbPullId', // Jenkins GitHub Pull Request Builder
    'TRAVIS_PULL_REQUEST', // TravisCI
  ]);

  const { CIRCLE_PULL_REQUEST, GITHUB_ACTIONS, GITHUB_REF } = process.env;

  // GitHub Actions ( requires `pull_request` event )
  if (GITHUB_ACTIONS === 'true' && /refs\/pull\/\d+/.test(GITHUB_REF)) {
    return GITHUB_REF.match(/refs\/pull\/(\d+)/)[1];
  }

  for (const key of ENV_VARS) {
    const id = process.env[key];
    if (id && id !== 'false') {
      return id;
    }
  }

  // CircleCI
  if (CIRCLE_PULL_REQUEST && CIRCLE_PULL_REQUEST !== 'false') {
    return CIRCLE_PULL_REQUEST.split('/').pop();
  }

  return '';
}

function verify(cwd, pkg, options) {
  try {
    fs.readdirSync(path.join(cwd, '.git'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return Promise.resolve();
    }

    throw err;
  }

  // Not making this configurable to prevent some possible abuse
  options.pr = getPullRequestId();

  function ensureLastVersionTag() {
    return ensureTag(cwd, `v${pkg.version}`);
  }

  function setReleaseType() {
    /* eslint no-console:0 */
    options.releaseType = determineReleaseInfo(
      options.commits,
      options.acceptInvalidCommits
    );
    const { releaseType } = options;
    const nextUpdate =
      releaseType !== 'none'
        ? `(${pkg.version} -> ${semver.inc(pkg.version, releaseType)})`
        : '';
    console.log('[nlm] Changes are %j %s', releaseType, nextUpdate);

    options.releaseType = releaseType;
  }

  const verifyTasks = [
    ensureLastVersionTag,
    getPendingChanges,
    setReleaseType,
    verifyLicenseHeaders,
    verifyClean,
    detectBranch,
    tagPullRequest,
  ];

  function runTask(task) {
    return task(cwd, pkg, options);
  }

  async function runVerifyTasks() {
    for (const task of verifyTasks) await runTask(task);
  }

  return runVerifyTasks();
}

module.exports = verify;
