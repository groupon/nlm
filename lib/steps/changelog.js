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
var _ = require('lodash');

var Github = require('../github/client');
var parseRepository = require('../github/parse-repository');

function addPullRequestCommits(pkg, commits, pr) {
  var github = Github.forRepository(pkg.repository);
  return Bluebird.all([
    github.pull.get(pr.pullId),
    github.pull.commits(pr.pullId),
  ]).spread(function expandCommitInfo(info, prCommits) {
    pr.author = {
      name: info.user.login,
      href: info.user.html_url,
    };
    pr.href = info.html_url;
    pr.title = info.title;
    var shas = pr.shas = _.pluck(prCommits, 'sha');
    pr.commits = commits.filter(function isPartOfPR(commit) {
      return shas.indexOf(commit.sha) !== -1;
    });
  });
}

function removePRCommits(commits, prs) {
  var prShas = _.flatten(_.pluck(prs, 'shas'));
  return _.filter(commits, function isNotInAnyPR(commit) {
    return commit.type !== 'pr' && prShas.indexOf(commit.sha) === -1;
  });
}

function extractBreakingChanges(commit) {
  if (!commit.notes || !commit.notes.length) {
    return [];
  }
  return _.filter(commit.notes, { title: 'BREAKING CHANGE' })
    .map(function buildChangeNote(note) {
      return { text: note.text, commit: commit };
    });
}

function generateChangeLog(cwd, pkg, options) {
  var repoInfo = parseRepository(pkg.repository);
  var commits = options.commits;
  var prs = _.filter(commits, { type: 'pr' });

  function getCommitLink(commit) {
    var abbr = commit.sha.substr(0, 7);
    var href = [
      repoInfo.htmlBase,
      repoInfo.username, repoInfo.repository,
      'commit', commit.sha,
    ].join('/');
    return '[`' + abbr + '`](' + href + ')';
  }

  function formatBreakingChange(change) {
    return change.text + '\n\n*See: ' + getCommitLink(change.commit) + '*';
  }

  function prependBreakingChanges(changelog) {
    var breaking = _(commits)
      .map(extractBreakingChanges)
      .flatten()
      .value();

    if (!breaking.length) return changelog;

    return [
      '#### Breaking Changes',
      '',
      breaking.map(formatBreakingChange).join('\n\n'),
      '',
      '#### Commits',
      '',
      changelog,
    ].join('\n');
  }

  function formatCommit(commit) {
    return getCommitLink(commit) + ' **' + commit.type + ':** ' + commit.subject;
  }

  function formatPR(pr) {
    var changes = pr.commits.map(formatCommit)
      .map(function withDashes(line) { return '  - ' + line; });

    var titleLine = pr.title +
      ' - **[@' + pr.author.name + '](' + pr.author.href +
      ')** [#' + pr.pullId + '](' + pr.href + ')';

    return [titleLine].concat(changes).join('\n');
  }

  /*
   * * {prTitle} - @{author} #{pullId}
   *   - {sha} {type}: {message}
   * * {sha} {type}: {message}
   */
  function formatCommits(orphans) {
    var changes = prs.map(formatPR)
      .concat(orphans.map(formatCommit))
      .map(function star(line) { return '* ' + line; });

    return changes.join('\n');
  }

  return Bluebird
    .each(prs, _.partial(addPullRequestCommits, pkg, commits))
    .then(_.partial(removePRCommits, commits, prs))
    .then(formatCommits)
    .then(prependBreakingChanges)
    .then(function setChangelog(changelog) {
      options.changelog = changelog;
      return changelog;
    });
}
module.exports = generateChangeLog;
