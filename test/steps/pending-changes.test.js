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

var assert = require('assertive');
var _ = require('lodash');

var getPendingChanges = require('../../lib/steps/pending-changes');

var withFixture = require('../fixture');

describe('getPendingChanges', function () {
  var dirname = withFixture('ticket-commits');
  var pkg = {
    version: '0.0.0',
    repository: 'usr/proj',
  };
  var options = {};

  before('create version commit', function () {
    return getPendingChanges(dirname, pkg, options);
  });

  it('adds the commits to the options', function () {
    assert.hasType(Array, options.commits);
  });

  it('resolves commit references', function () {
    var commit = _.find(options.commits, { subject: 'Jira' });
    assert.equal(1, commit.references.length);
    var ref = commit.references[0];
    assert.equal('REPO-', ref.prefix);
    assert.equal('https://jira.atlassian.com/browse/REPO-2001', ref.href);
  });

  it('truncates full urls to same repo', function () {
    var commit = _.find(options.commits, { subject: 'Truncate' });
    assert.equal(1, commit.references.length);
    var ref = commit.references[0];
    assert.equal('#', ref.prefix);
    assert.equal('https://github.com/usr/proj/issues/44', ref.href);
  });

  it('builds nice references to sibling repos', function () {
    var commit = _.find(options.commits, { subject: 'Full' });
    assert.equal(1, commit.references.length);
    var ref = commit.references[0];
    assert.equal('open/source#', ref.prefix);
    assert.equal('https://github.com/open/source/issues/13', ref.href);
  });

  it('expands short-style refs', function () {
    var commit = _.find(options.commits, { subject: 'Short' });
    assert.equal(1, commit.references.length);
    var ref = commit.references[0];
    assert.equal('#', ref.prefix);
    assert.equal('https://github.com/usr/proj/issues/42', ref.href);
  });

  it('supports refs to other Github instances', function () {
    var commit = _.find(options.commits, { subject: 'GHE' });
    assert.equal(1, commit.references.length);
    var ref = commit.references[0];
    assert.equal('github.example.com/some/thing#', ref.prefix);
    assert.equal('https://github.example.com/some/thing/issues/72', ref.href);
  });
});
