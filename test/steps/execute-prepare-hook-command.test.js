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

/* eslint-disable import/no-dynamic-require */

'use strict';

const fs = require('fs');

const assert = require('assertive');

const executePrepareHookCommand = require('../../lib/steps/execute-prepare-hook-command');

const withFixture = require('../fixture');

describe('executePrepareHookCommand', () => {
  const dirname = withFixture('empty-project');

  describe('when no hooks', () => {
    it('does nothing', () => {
      executePrepareHookCommand(dirname, null, {});
    });
  });

  describe('when hooks is empty', () => {
    it('does nothing', () => {
      executePrepareHookCommand(dirname, null, {
        hooks: {},
      });
    });
  });

  describe('when hooks does not contain *prepare* hook', () => {
    it('does nothing', () => {
      executePrepareHookCommand(dirname, null, {
        hooks: { dummy: 'blabla' },
      });
    });
  });

  describe('when hooks contains *prepare* hook', () => {
    it('executes the command defined in the value', () => {
      const expectedVersion = '1.0.0';
      const tmpFilename = 'tmp.txt';
      executePrepareHookCommand(dirname, null, {
        nextVersion: expectedVersion,
        hooks: { prepare: `printf $NLM_NEXT_VERSION >> ${tmpFilename}` },
      });
      const version = fs.readFileSync(`${dirname}/${tmpFilename}`, 'utf8');
      assert.equal(version, expectedVersion);
    });
  });
});
