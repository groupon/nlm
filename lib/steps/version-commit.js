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

var _ = require('lodash');

var run = require('../run');

var NLM_GIT_NAME = 'nlm';
var NLM_GIT_EMAIL = 'opensource@groupon.com';

function addFiles(cwd) {
  return run('git', ['add', 'CHANGELOG.md', 'package.json'], { cwd: cwd });
}

function commit(cwd, message) {
  return run('git', ['commit', '-m', message], {
    cwd: cwd,
    env: _.assign({}, process.env, {
      GIT_AUTHOR_NAME: NLM_GIT_NAME,
      GIT_AUTHOR_EMAIL: NLM_GIT_EMAIL,
      GIT_COMMITTER_NAME: NLM_GIT_NAME,
      GIT_COMMITTER_EMAIL: NLM_GIT_EMAIL,
    }),
  });
}

function getHEAD(cwd) {
  return run('git', ['rev-parse', 'HEAD'], { cwd: cwd });
}

function createVersionCommit(cwd, pkg, options) {
  var changeLogFile = path.join(cwd, 'CHANGELOG.md');
  var changeLogContent;
  try {
    changeLogContent = '\n\n\n' + fs.readFileSync(changeLogFile, 'utf8').trim();
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    changeLogContent = '';
  }
  changeLogContent = '### ' + options.nextVersion + '\n\n' + options.changelog + changeLogContent;
  fs.writeFileSync(changeLogFile, changeLogContent.trim() + '\n');

  var packageJsonFile = path.join(cwd, 'package.json');
  pkg.version = options.nextVersion;
  fs.writeFileSync(packageJsonFile, JSON.stringify(pkg, null, 2) + '\n');

  return addFiles(cwd)
    .then(_.partial(commit, cwd, 'v' + pkg.version))
    .then(_.partial(getHEAD, cwd))
    .then(function setVersionCommitSha(output) {
      options.versionCommitSha = output.trim();
      return options.versionCommitSha;
    });
}
module.exports = createVersionCommit;
