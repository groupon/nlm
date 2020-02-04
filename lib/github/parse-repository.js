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

const PUBLIC_BASE = 'https://api.github.com';

function parseRepository(repositoryField) {
  const repository =
    typeof repositoryField === 'string'
      ? repositoryField
      : repositoryField && repositoryField.url;

  if (!repository || typeof repository !== 'string') {
    throw new Error(`Invalid or missing repository field: ${repositoryField}`);
  } // Transform git@ into git+ssh://git@ which URL constructor can handle

  const url = repository.replace(/^git@([^:]+):(.*)$/, 'git+ssh://git@$1/$2');
  const parsed = new URL(url, 'git+ssh://git@github.com');
  const host = parsed.host || 'github.com';
  const match = (parsed.pathname || '').match(
    /^\/?([\w-]+)\/([\w-.]+?)(?:\.git)?$/
  );

  if (match === null) {
    throw new Error(`Could not parse git repository: ${repository}`);
  }

  const protocol = parsed.protocol === 'http:' ? 'http://' : 'https://';
  return {
    baseUrl: host === 'github.com' ? PUBLIC_BASE : `${protocol + host}/api/v3`,
    htmlBase: protocol + host,
    username: match[1],
    repository: match[2],
  };
}

module.exports = parseRepository;
