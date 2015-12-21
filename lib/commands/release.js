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

var Bluebird = require('bluebird');
var debug = require('debug')('nlm:command:release');
var _ = require('lodash');
var semver = require('semver');

var generateChangeLog = require('../steps/changelog');
var createVersionCommit = require('../steps/version-commit');
var pushReleaseToRemote = require('../steps/push-to-remote');
var createGithubRelease = require('../steps/github-release');
var publishToNpm = require('../steps/publish-to-npm');

var runVerify = require('./verify');

function bumpVersion(version, type) {
  if (type === 'none') {
    throw new Error('Cannot publish without changes');
  }
  if (/^0\./.test(version)) {
    return '1.0.0';
  }
  return semver.inc(version, type);
}

function release(cwd, pkg, options) {
  function setNextVersion() {
    /* eslint no-console: 0 */
    options.nextVersion = bumpVersion(pkg.version, options.releaseType);
    console.log('[nlm] Publishing %j from %j as %j',
      options.nextVersion, options.currentBranch, options.distTag);
  }

  var publishTasks = [
    setNextVersion,
    generateChangeLog,
    createVersionCommit,
    pushReleaseToRemote,
    createGithubRelease,
  ];

  function runTask(task) {
    return task(cwd, pkg, options);
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

  return runVerify(cwd, pkg, options)
    .then(options.commit ? runPublishTasks : _.noop)
    .then(options.commit ? publishToNpm : _.noop);
}
module.exports = release;
