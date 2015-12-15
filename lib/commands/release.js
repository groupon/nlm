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

const Bluebird = require('bluebird');
const debug = require('debug')('nlm:command:release');
const _ = require('lodash');
const semver = require('semver');

const addLicenseHeaders = require('../license');

const verifyClean = require('../git/verify-clean');
const ensureTag = require('../git/ensure-tag');

const determineReleaseInfo = require('../steps/release-info');
const tagPullRequest = require('../steps/tag-pr');
const generateChangeLog = require('../steps/changelog');
const createVersionCommit = require('../steps/version-commit');
const pushReleaseToRemote = require('../steps/push-to-remote');
const createGithubRelease = require('../steps/github-release');
const getPendingChanges = require('../steps/pending-changes');
const detectBranch = require('../steps/detect-branch');

function verifyLicenseHeaders(cwd, pkg, options) {
  const whitelist = options.license && options.license.files || pkg.files;
  const exclude = options.license && options.license.exclude;
  return addLicenseHeaders(cwd, whitelist, exclude);
}

function bumpVersion(version, type) {
  if (type === 'none') {
    throw new Error(`Cannot publish without changes`);
  }
  if (version === '0.0.0') {
    return '1.0.0';
  }
  return semver.inc(version, type);
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

function release(cwd, pkg, options) {
  // Not making this configurable to prevent some possible abuse
  options.pr = getPullRequestId();

  const verifyTasks = [
    () => ensureTag(cwd, `v${pkg.version}`),
    getPendingChanges,
    () => {
      /* eslint no-console:0 */
      options.releaseType = determineReleaseInfo(options.commits);
      console.log('[nlm] Changes are %j', options.releaseType);
    },
    verifyLicenseHeaders,
    verifyClean,
    detectBranch,
    tagPullRequest,
  ];

  const publishTasks = [
    () => {
      options.nextVersion = bumpVersion(pkg.version, options.releaseType);
      console.log('[nlm] Publishing %j from %j as %j',
        options.nextVersion, options.currentBranch, options.distTag);
    },
    generateChangeLog,
    createVersionCommit,
    pushReleaseToRemote,
    createGithubRelease,
  ];

  function runTask(task) {
    return task(cwd, pkg, options);
  }

  function runVerifyTasks() {
    return Bluebird.each(verifyTasks, runTask);
  }

  function runPublishTasks() {
    if (options.releaseType === 'none') {
      debug('Nothing to release');
      return null;
    }
    if (!!options.pr) {
      debug('Never publishing from a PR');
      return null;
    }
    if (!options.commit) {
      debug('Skipping publish');
      return null;
    }
    if (!options.distTag) {
      debug('Skipping publish, no dist-tag');
      return null;
    }
    return Bluebird.each(publishTasks, runTask);
  }

  return runVerifyTasks()
    .then(options.commit ? runPublishTasks : _.noop)
    .catch(error => {
      /* eslint no-console:0 */
      if (error.body && error.statusCode) {
        console.error('Response %j: %j', error.statusCode, error.body);
      }
      const errorMessage = error.message.split('\n').join('\n! ');
      console.error(`\n!\n! ${errorMessage}\n!\n! NOT OK`);
      process.exit(1);
    });
}
module.exports = release;
