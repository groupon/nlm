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

const getCommits = require('../git/commits');
const parseRepository = require('../github/parse-repository');

const JIRA_PATTERN = /https?:\/\/[\w.-]+\/browse\/(\w+-)/;
const GITHUB_PATTERN = /(https?:\/\/([\w.-]+))\/([^/]+)\/([^/]+)\/issues\//;

function normalizeReferences(meta, commit) {
  function normalizeInternalReference(ref) {
    ref.owner = ref.owner || meta.username;
    ref.repository = ref.repository || meta.repository;
    ref.href = `${meta.htmlBase}/${ref.owner}/${ref.repository}/issues/${ref.issue}`;

    if (ref.owner === meta.username && ref.repository === meta.repository) {
      ref.prefix = '#';
    } else {
      ref.prefix = `${ref.owner}/${ref.repository}#`;
    }
  }

  function normalizeReference(ref) {
    // Cases:
    // 1. It's a Jira-style url
    // 2. It's a Github-style url
    // 3. It's any other kind of url
    // 4. We can trust owner/username/issue and resolve based on meta.htmlBase
    const jiraMatch = ref.prefix.match(JIRA_PATTERN);
    const ghMatch = ref.prefix.match(GITHUB_PATTERN);

    if (jiraMatch) {
      ref.prefix = jiraMatch[1];
      ref.href = ref.raw;
    } else if (ghMatch) {
      ref.owner = ghMatch[3];
      ref.repository = ghMatch[4];
      if (ghMatch[1] !== meta.htmlBase) {
        ref.href = ref.raw;
        ref.prefix = `${ghMatch[2]}/${ref.owner}/${ref.repository}#`;
      } else {
        normalizeInternalReference(ref);
      }
    } else if (/^https?:\/\//.test(ref.prefix)) {
      ref.prefix = '';
      ref.href = ref.raw;
    } else {
      normalizeInternalReference(ref);
    }
  }
  commit.references.forEach(normalizeReference);
  return commit;
}

function getPendingChanges(cwd, pkg, options) {
  const meta = parseRepository(pkg.repository);
  return getCommits(cwd, `v${pkg.version}`).then(commits => {
    options.commits = commits.map(normalizeReferences.bind(null, meta));
  });
}
module.exports = getPendingChanges;
