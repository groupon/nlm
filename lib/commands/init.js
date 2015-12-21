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

var fs = require('fs');
var path = require('path');

var Bluebird = require('bluebird');
var inquirer = require('inquirer');
var _ = require('lodash');
var rc = require('rc');

var Github = require('../github/client');
var setupLabels = require('../github/setup-labels');

var BIN_NAME = require('../../package.json').name;

var RELEASE_CMD = BIN_NAME + 'release';
var npmConfig = rc('npm');

var askAsync = Bluebird.promisify(function ask(questions, cb) {
  // prompt has no notion of errors, so we always pass `null` first.
  inquirer.prompt(questions, _.partial(cb, null));
});

function getGithubToken(options) {
  var envToken = process.env.GH_TOKEN;
  if (envToken) return Bluebird.resolve(envToken);
  if (options.yes) return Bluebird.resolve(null);

  return askAsync([
    {
      type: 'password',
      name: 'githubToken',
      message: 'Github access token (leave empty to skip)',
    },
  ]).then(function setGithubTokenFromAnswers(answers) {
    var githubToken = answers.githubToken;
    if (githubToken) {
      process.env.GH_TOKEN = githubToken;
    }
    return githubToken;
  });
}

function initModule(cwd, pkg, options) {
  /* eslint no-console:0 */
  var packageJsonFile = path.join(cwd, 'package.json');
  var changedPackageJson = false;

  function writePackageJSON() {
    fs.writeFileSync(packageJsonFile, JSON.stringify(pkg, null, 2) + '\n');
    console.log('[nlm] Wrote updated package.json');
  }

  function updatePackageJSON(labels) {
    if (labels && labels.length) {
      console.log('[nlm] Created Github labels', labels);
    }

    var publishConfig = pkg.publishConfig = pkg.publishConfig || {};
    if (!publishConfig.registry) {
      publishConfig.registry = npmConfig.registry || 'https://registry.npmjs.org';
      changedPackageJson = true;
      console.log('[nlm] Setting publishConfig.registry:', publishConfig.registry);
    }

    var scripts = pkg.scripts = pkg.scripts || {};
    if (!scripts.posttest) {
      scripts.posttest = RELEASE_CMD;
      changedPackageJson = true;
      console.log('[nlm] Setting posttest script:', scripts.posttest);
    } else if (scripts.posttest !== RELEASE_CMD) {
      console.log('[nlm] WARNING: Could not set posttest script', scripts.posttest);
    }

    if (!changedPackageJson) return null;

    if (options.yes) {
      return writePackageJSON();
    }
    return askAsync([
      {
        type: 'confirm',
        name: 'write',
        message: 'Write package.json updates?',
        default: true,
      },
    ]).then(function writeIfConfirmed(answers) {
      if (answers.write) writePackageJSON();
    });
  }

  var repository = pkg.repository;
  if (!repository) {
    console.log('[nlm] Skipping Github setup, no repository field');
    return updatePackageJSON();
  }

  return getGithubToken(options)
    .then(function runGithubSetup(githubToken) {
      if (!githubToken) {
        console.log('[nlm] Skipping Github interactions, no GH_TOKEN');
        return updatePackageJSON();
      }
      var github = Github.forRepository(repository);
      return setupLabels(github)
        .then(updatePackageJSON);
    });
}
module.exports = initModule;
