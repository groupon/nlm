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

const co = require('co');

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
  const travisId = process.env.TRAVIS_PULL_REQUEST;
  if (travisId && travisId !== 'false') {
    return travisId;
  }
  const dotciId = process.env.DOTCI_PULL_REQUEST;
  if (dotciId && dotciId !== 'false') {
    return dotciId;
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
    console.log('[nlm] Changes are %j', options.releaseType);
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

  const runVerifyTasks = co.wrap(function*() {
    for (const task of verifyTasks) yield Promise.resolve(runTask(task));
  });

  return runVerifyTasks();
}
module.exports = verify;
