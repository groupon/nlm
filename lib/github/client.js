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

const util = require('util');

const Gofer = require('gofer');

const parseRepository = require('./parse-repository');

function Github(config) {
  Gofer.call(this, config, 'github');
}

util.inherits(Github, Gofer);
Github.prototype.registerEndpoints({
  pull: function pull(request) {
    return {
      commits: function commits(pullId) {
        return request('/repos/{owner}/{repo}/pulls/{pullId}/commits', {
          pathParams: {
            pullId,
          },
        }).json();
      },
      get: function get(pullId) {
        return request('/repos/{owner}/{repo}/pulls/{pullId}', {
          pathParams: {
            pullId,
          },
        }).json();
      },
    };
  },
  labels: function labelsEndpoint(request) {
    return {
      create: function create(label) {
        return request('/repos/{owner}/{repo}/labels', {
          method: 'POST',
          json: label,
        }).json();
      },
      list: function list() {
        return request('/repos/{owner}/{repo}/labels', {}).json();
      },
      listByIssue: function listByIssue(issueId) {
        return request('/repos/{owner}/{repo}/issues/{issueId}/labels', {
          pathParams: {
            issueId,
          },
        }).json();
      },
      setForIssue: function setForIssue(issueId, labels) {
        return request('/repos/{owner}/{repo}/issues/{issueId}/labels', {
          method: 'PUT',
          pathParams: {
            issueId,
          },
          json: labels,
        });
      },
    };
  },
  releases: function releases(request) {
    return {
      create: function create(release) {
        return request('/repos/{owner}/{repo}/releases', {
          method: 'POST',
          json: release,
        }).json();
      },
    };
  },
  tags: function tags(request) {
    return {
      get: function get(tag) {
        return request('/repos/{owner}/{repo}/git/refs/tags/{tag}', {
          pathParams: {
            tag,
          },
        }).json();
      },
    };
  },
});

Github.forRepository = function forRepository(repository) {
  const repoInfo = parseRepository(repository);
  return new Github({
    github: {
      baseUrl: repoInfo.baseUrl,
      pathParams: {
        owner: repoInfo.username,
        repo: repoInfo.repository,
      },
      headers: {
        Authorization: `token ${process.env.GH_TOKEN}`,
      },
    },
  });
};

module.exports = Github;
