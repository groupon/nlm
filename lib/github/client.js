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
const Gofer = require('gofer');

const parseRepository = require('./parse-repository');

class Github extends Gofer {
  get serviceName() { return 'github'; }
}

Github.prototype.registerEndpoints({
  pull(request) {
    return {
      commits(pullId) {
        return request({
          uri: '/repos/{owner}/{repo}/pulls/{pullId}/commits',
          pathParams: { pullId },
        }).then();
      },
      get(pullId) {
        return request({
          uri: '/repos/{owner}/{repo}/pulls/{pullId}',
          pathParams: { pullId },
        }).then();
      },
    };
  },

  labels(request) {
    return {
      create(label) {
        return request({
          method: 'POST',
          uri: '/repos/{owner}/{repo}/labels',
          json: label,
        }).then();
      },
      list() {
        return request({
          uri: '/repos/{owner}/{repo}/labels',
        }).then();
      },
      listByIssue(issueId) {
        return request({
          uri: '/repos/{owner}/{repo}/issues/{issueId}/labels',
          pathParams: { issueId },
        }).then();
      },
      setForIssue(issueId, labels) {
        return request({
          method: 'PUT',
          uri: '/repos/{owner}/{repo}/issues/{issueId}/labels',
          pathParams: { issueId },
          json: labels,
        });
      },
    };
  },

  releases(request) {
    return {
      create(release) {
        return request({
          method: 'POST',
          uri: '/repos/{owner}/{repo}/releases',
          json: release,
        }).then();
      },
    };
  },

  tags(request) {
    return {
      get(tag) {
        return request({
          uri: '/repos/{owner}/{repo}/git/refs/tags/{tag}',
          pathParams: { tag },
        }).then();
      },
    };
  },
});

Github.forRepository = function forRepository(repository) {
  const repoInfo = parseRepository(repository);
  const github = new Github({
    github: {
      baseUrl: repoInfo.baseUrl,
      pathParams: {
        owner: repoInfo.username,
        repo: repoInfo.repository,
      },
      headers: {
        'Authorization': `token ${process.env.GH_TOKEN}`,
      },
    },
  });
  github.hub.Promise = Bluebird;
  return github;
};

module.exports = Github;
