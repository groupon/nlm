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

var path = require('path');

var _ = require('lodash');
var minimist = require('minimist');
var rc = require('rc');

var COMMANDS = {
  changelog: require('./commands/changelog'),
  release: require('./commands/release'),
  verify: require('./commands/verify'),
};

var USAGE = [
  'Usage: nlm changelog  # Preview the changelog for the next release',
  '       nlm release    # Create a release, push to github & npm',
  '       nlm verify     # Check that the current state could be released',
  '',
  'Options:',
  '  -y, --yes           Don\'t ask for permission. Just do it.',
  '                      Defaults to true unless running in a TTY.',
  '  --commit            Actually make changes, not just verify.',
  '                      Defaults to true in a CI environment.',
  '  -v, --version       Print nlm version',
  '  -h, --help          Print usage information',
].join('\n');

var argv = rc('nlm', {
  'channels': {
    'master': 'latest',
  },
}, minimist(process.argv.slice(2), {
  boolean: ['help', 'version', 'yes', 'commit'],
  string: ['pr'],
  alias: { 'help': 'h', 'version': 'v', 'yes': 'y' },
  default: {
    'yes': !!process.env.CI || !process.stdout.isTTY,
    'commit': !!process.env.CI,
  },
}));

var command = COMMANDS[argv._.shift()];

function prettyPrintErrorAndExit(error) {
  /* eslint no-console:0 */
  if (error.body && error.statusCode) {
    console.error('Response %j: %j', error.statusCode, error.body);
  }
  var errorMessage = error.message.split('\n').join('\n! ');
  console.error('\n!\n! ' + errorMessage + '\n!\n! NOT OK');
  process.exit(1);
}

if (argv.version) {
  process.stdout.write(require('../package.json').version + '\n');
  process.exit(0);
} else if (argv.help || !command) {
  process.stderr.write(USAGE + '\n');
  process.exit(argv.help ? 0 : 1);
} else {
  var cwd = process.cwd();
  var packageJsonFile = path.join(cwd, 'package.json');
  var pkg = require(packageJsonFile);
  command(cwd, pkg, pkg.nlm ? _.merge({}, pkg.nlm, argv) : argv)
    .catch(prettyPrintErrorAndExit)
    .done();
}
