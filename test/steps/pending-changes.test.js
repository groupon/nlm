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

const assert = require('assert');

const getPendingChanges = require('../../lib/steps/pending-changes');

const withFixture = require('../fixture');

describe('getPendingChanges', () => {
  const dirname = withFixture('ticket-commits');
  const pkg = {
    version: '0.0.0',
    repository: 'usr/proj',
  };
  const options = {};

  before('create version commit', () => {
    return getPendingChanges(dirname, pkg, options);
  });

  function assertChange(subject, expected) {
    const commit = options.commits.find(c => c.subject === subject);
    assert.strictEqual(commit.references.length, expected.refLength);

    const ref = commit.references[0];
    assert.strictEqual(ref.prefix, expected.prefix);
    assert.strictEqual(ref.href, expected.href);
  }

  it('adds the commits to the options', () => {
    assert.ok(Array.isArray(options.commits));
  });

  it('resolves commit references', () => {
    const expected = {
      refLength: 1,
      prefix: 'REPO-',
      href: 'https://jira.atlassian.com/browse/REPO-2001',
    };

    assertChange('Jira', expected);
  });

  it('truncates full urls to same repo', () => {
    const expected = {
      refLength: 1,
      prefix: '#',
      href: 'https://github.com/usr/proj/issues/44',
    };

    assertChange('Truncate', expected);
  });

  it('builds nice references to sibling repos', () => {
    const expected = {
      refLength: 1,
      prefix: 'open/source#',
      href: 'https://github.com/open/source/issues/13',
    };

    assertChange('Full', expected);
  });

  it('expands short-style refs', () => {
    const expected = {
      refLength: 1,
      prefix: '#',
      href: 'https://github.com/usr/proj/issues/42',
    };

    assertChange('Short', expected);
  });

  it('supports refs to other Github instances', () => {
    const expected = {
      refLength: 1,
      prefix: 'github.example.com/some/thing#',
      href: 'https://github.example.com/some/thing/issues/72',
    };

    assertChange('GHE', expected);
  });
});
