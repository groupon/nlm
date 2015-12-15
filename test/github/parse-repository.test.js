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

const assert = require('assertive');

const parseRepository = require('../../lib/github/parse-repository');

function checkParsed(expected, name) {
  const result = parseRepository(name);
  assert.deepEqual(expected, result);
}

describe('parseRepository', () => {
  describe('github.com', () => {
    const expected = {
      baseUrl: 'https://api.github.com',
      htmlBase: 'https://github.com',
      username: 'myname',
      repository: 'myproject',
    };

    it('understands ssh urls', () => {
      [
        'git+ssh://git@github.com/myname/myproject',
        'git+ssh://git@github.com/myname/myproject.git',
        'git@github.com:myname/myproject',
        'git@github.com:myname/myproject.git',
      ].forEach(name => checkParsed(expected, name));
    });

    it('understands https urls', () => {
      [
        'https://github.com/myname/myproject',
        'https://github.com/myname/myproject.git',
      ].forEach(name => checkParsed(expected, name));
    });

    it('understands git urls', () => {
      [
        'git://github.com/myname/myproject',
        'git://github.com/myname/myproject.git',
      ].forEach(name => checkParsed(expected, name));
    });

    it('understands npm-style shorthands', () => {
      [
        'myname/myproject',
      ].forEach(name => checkParsed(expected, name));
    });
  });

  describe('Github Enterprise', () => {
    const expected = {
      baseUrl: 'https://ghe.mycorp.com/api/v3',
      htmlBase: 'https://ghe.mycorp.com',
      username: 'myname',
      repository: 'myproject',
    };

    it('understands ssh urls', () => {
      [
        'git@ghe.mycorp.com:myname/myproject',
        'git@ghe.mycorp.com:myname/myproject.git',
        'git+ssh://git@ghe.mycorp.com/myname/myproject',
        'git+ssh://git@ghe.mycorp.com/myname/myproject.git',
      ].forEach(name => checkParsed(expected, name));
    });

    it('understands https urls', () => {
      [
        'https://ghe.mycorp.com/myname/myproject',
        'https://ghe.mycorp.com/myname/myproject.git',
      ].forEach(name => checkParsed(expected, name));
    });

    it('understands git urls', () => {
      [
        'git://ghe.mycorp.com/myname/myproject',
        'git://ghe.mycorp.com/myname/myproject.git',
      ].forEach(name => checkParsed(expected, name));
    });
  });
});
