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

const Bluebird = require('bluebird');
const inquirer = require('inquirer');
const rc = require('rc');

const Github = require('../github/client');
const setupLabels = require('../github/setup-labels');

const BIN_NAME = require('../../package.json').name;

const RELEASE_CMD = `${BIN_NAME} release`;
const npmConfig = rc('npm');

const askAsync = Bluebird.promisify((questions, cb) =>
  inquirer.prompt(questions, answers => cb(null, answers)));

function getGithubToken(options) {
  const envToken = process.env.GH_TOKEN;
  if (envToken) return Bluebird.resolve(envToken);
  if (options.yes) return Bluebird.resolve(null);

  return askAsync([
    {
      type: 'password',
      name: 'githubToken',
      message: 'Github access token (leave empty to skip)',
    },
  ]).then(answers => {
    const githubToken = answers.githubToken;
    if (githubToken) {
      process.env.GH_TOKEN = githubToken;
    }
    return githubToken;
  });
}

function initModule(cwd, pkg, options) {
  /* eslint no-console:0 */
  const packageJsonFile = path.join(cwd, 'package.json');
  let changedPackageJson = false;

  function writePackageJSON() {
    fs.writeFileSync(packageJsonFile, JSON.stringify(pkg, null, 2) + '\n');
    console.log('[nlm] Wrote updated package.json');
  }

  function updatePackageJSON(labels) {
    if (labels && labels.length) {
      console.log('[nlm] Created Github labels', labels);
    }

    const publishConfig = pkg.publishConfig = pkg.publishConfig || {};
    if (!publishConfig.registry) {
      publishConfig.registry = npmConfig.registry || 'https://registry.npmjs.org';
      changedPackageJson = true;
      console.log('[nlm] Setting publishConfig.registry:', publishConfig.registry);
    }

    const scripts = pkg.scripts = pkg.scripts || {};
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
    ]).then(answers => {
      if (answers.write) writePackageJSON();
    });
  }

  const repository = pkg.repository;
  if (!repository) {
    console.log('[nlm] Skipping Github setup, no repository field');
    return updatePackageJSON();
  }

  return getGithubToken(options)
    .then(githubToken => {
      if (!githubToken) {
        console.log('[nlm] Skipping Github interactions, no GH_TOKEN');
        return updatePackageJSON();
      }
      const github = Github.forRepository(repository);
      return setupLabels(github)
        .then(updatePackageJSON);
    });
}
module.exports = initModule;
