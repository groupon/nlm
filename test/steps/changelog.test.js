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

var generateChangeLog = require('../../lib/steps/changelog');

describe('generateChangeLog', function () {
  it('can create an empty changelog', function () {
    var pkg = { repository: 'usr/proj' };
    var commits = [];
    var options = { commits: commits };
    return generateChangeLog(null, pkg, options)
      .then(function (changelog) {
        assert.equal('', changelog);
      });
  });

  it('links to github issues and jira tickets', function () {
    var pkg = { repository: 'usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
        references: [
          {
            action: 'Closes',
            issue: '7',
            prefix: 'fo/ba#',
            href: 'https://gitub.com/fo/ba/issues/7',
          },
        ],
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
        references: [
          {
            action: 'Resolves',
            issue: '2010',
            prefix: 'THING-',
            href: 'https://example.com/browse/THING-7',
          },
          {
            action: 'Fixes',
            issue: '44',
            prefix: '#',
            href: 'https://github.com/usr/proj/issues/44',
          },
        ],
      },
    ];
    var options = { commits: commits };
    var href0 = 'https://github.com/usr/proj/commit/' + commits[0].sha;
    var href1 = 'https://github.com/usr/proj/commit/' + commits[1].sha;
    return generateChangeLog(null, pkg, options)
      .then(function (changelog) {
        var lines = changelog.split('\n');
        assert.equal(
          '* [`1234567`](' + href0 + ') **fix:** Stop doing the wrong thing - see: ' +
            '[fo/ba#7](https://gitub.com/fo/ba/issues/7)',
          lines[0]);
        assert.equal(
          '* [`2234567`](' + href1 + ') **feat:** Do more things - see: ' +
            '[THING-2010](https://example.com/browse/THING-7), ' +
            '[#44](https://github.com/usr/proj/issues/44)',
          lines[1]);
      });
  });

  it('can create a changelog for two commits', function () {
    var pkg = { repository: 'usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
      },
    ];
    var options = { commits: commits };
    var href0 = 'https://github.com/usr/proj/commit/' + commits[0].sha;
    var href1 = 'https://github.com/usr/proj/commit/' + commits[1].sha;
    return generateChangeLog(null, pkg, options)
      .then(function (changelog) {
        assert.equal([
          '* [\`1234567\`](' + href0 + ') **fix:** Stop doing the wrong thing',
          '* [\`2234567\`](' + href1 + ') **feat:** Do more things',
        ].join('\n'), changelog);
      });
  });

  it('puts breaking changes ahead of everything else', function () {
    var pkg = { repository: 'usr/proj' };
    var commits = [
      {
        sha: '1234567890123456789012345678901234567890',
        type: 'fix',
        subject: 'Stop doing the wrong thing',
      },
      {
        sha: '2234567890123456789012345678901234567890',
        type: 'feat',
        subject: 'Do more things',
        notes: [
          {
            title: 'BREAKING CHANGE',
            text: 'The interface of this library changed in some way.',
          },
        ],
      },
    ];
    var options = { commits: commits };
    var href0 = 'https://github.com/usr/proj/commit/' + commits[0].sha;
    var href1 = 'https://github.com/usr/proj/commit/' + commits[1].sha;
    return generateChangeLog(null, pkg, options)
      .then(function (changelog) {
        assert.equal([
          '#### Breaking Changes',
          '',
          'The interface of this library changed in some way.',
          '',
          '*See: [\`2234567\`](' + href1 + ')*',
          '',
          '#### Commits',
          '',
          '* [\`1234567\`](' + href0 + ') **fix:** Stop doing the wrong thing',
          '* [\`2234567\`](' + href1 + ') **feat:** Do more things',
        ].join('\n'), changelog);
      });
  });
});
