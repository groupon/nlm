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

var run = require('../../lib/run');

var withFixture = require('../fixture');

var CLI_PATH = require.resolve('../../lib/cli');

describe('nlm verify', function () {
  describe('in non-git directory', function () {
    var dirname = withFixture('non-git');
    var output = {};

    before(function () {
      return run(process.execPath, [CLI_PATH, 'verify'], {
        cwd: dirname,
        env: _.assign({}, process.env, {
          GH_TOKEN: '',
        }),
      }).then(function (stdout) {
        output.stdout = stdout;
      });
    });

    it('ignores directories that are not git repos', function () {
      assert.equal('', output.stdout);
    });
  });

  describe('in git directory', function () {
    var dirname = withFixture('released');
    var output = {};

    before(function () {
      return run(process.execPath, [CLI_PATH, 'verify'], {
        cwd: dirname,
        env: _.assign({}, process.env, {
          GH_TOKEN: '',
        }),
      }).then(function (stdout) {
        output.stdout = stdout;
      });
    });

    it('reports the change type', function () {
      assert.include('Changes are "none"', output.stdout);
    });
  });
});
