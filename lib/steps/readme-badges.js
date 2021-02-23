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

const debug = require('debug')('nlm:badges');
const debugStep = require('debug')('nlm:step');
const path = require('path');
const fs = require('fs');

/**
 * @param {string} url
 * @returns {string}
 */
function getLastPath(url) {
  if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return new URL(url).pathname.split('/').pop();
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {{value: string, key: string, url: string}}
 */
function extractUrl(key, value) {
  let url = value;
  // slack
  if (/([\w-]+)\.(slack)\.com(\/messages\/([\w]+))?/g.test(value)) {
    key = 'slack';
    value = getLastPath(value);
  } else if (/^https?:\/\/jira\.[\w]+[.\w]+/g.test(value)) {
    key = 'jira';
    value = getLastPath(value);
  } else if (/@/.test(value) && !value.startsWith('mailto:')) {
    url = `mailto:${value}`;
  }

  return { key, value, url };
}

/**
 * @param {string} str
 * @returns {string}
 */
function encode(str) {
  return encodeURIComponent(str).replace(/-/g, '--');
}
/**
 * @param {string} label
 * @param {string} message
 * @param {string} color
 * @return {string}
 */
function shieldsBadge(label, message, color) {
  return `![nlm-${label}](https://img.shields.io/badge/${encode(
    label
  )}-${encode(message)}-${color})`;
}

/**
 * @param {packageJson} pkg
 * @param {{nlmOptions?: { badges?: {npm : {enable?: boolean, color?: string}}}}} options
 * @returns {Map<any, any>}
 */
function npmBadges(pkg, options) {
  const { nlmOptions = {} } = options;

  const opts = {
    color: 'blue',
    enable: true,
    ...((nlmOptions.badges && nlmOptions.badges.npm) || {}),
  };
  const badges = new Map();

  if (!opts.enable) {
    return badges;
  }

  debug('version', pkg.version);
  debug('next version', options.nextVersion);

  const version = options.nextVersion || pkg.version;

  return Object.entries({
    ...(version && { version }),
    ...pkg.engines,
  }).reduce((acc, [key, value]) => {
    acc.set(key, shieldsBadge(key, value, opts.color));
    return acc;
  }, badges);
}

/**
 * @param {{bugs: Record<string, string>}} pkg
 * @param {{nlmOptions?: { badges?: {meta: {color?: string, enable?: boolean, url?: boolean}}}}} options
 * @returns {Map<any, any>}
 */
function metaInfoBadges(pkg, options) {
  const { nlmOptions = {} } = options;
  const badges = new Map();

  const opts = {
    color: 'F4D03F',
    enable: true,
    url: true,
    ...((nlmOptions.badges && nlmOptions.badges.meta) || {}),
  };

  return opts.enable && pkg.bugs
    ? Object.entries(pkg.bugs).reduce((acc, [key, value]) => {
        const data = extractUrl(key, value);
        const badge = shieldsBadge(data.key, data.value, opts.color);
        const finalBadge = opts.url ? `[${badge}](${data.url})` : badge;

        acc.set(data.key, finalBadge);
        return acc;
      }, badges)
    : badges;
}

/**
 * @param {number} percentage
 * @param {[number, string][]} thresholds
 * @returns {string}
 */
function getCoverageColor(percentage, thresholds) {
  const sorted = thresholds.sort(([old_pct], [new_pct]) => {
    if (Number(old_pct) < Number(new_pct)) return +1;
    if (Number(old_pct) > Number(new_pct)) return -1;
    return 0;
  });
  let selectedColor;
  for (const [pct, color] of sorted) {
    if (percentage <= pct) {
      selectedColor = color;
    } else {
      break;
    }
  }

  return selectedColor;
}

/**
 * @param {packageJson} pkg
 * @param {{nlmOptions?: { badges?: {coverage: {enable?: boolean, thresholds?: [number, string][]}}}}} options
 * @param {string} cwd
 * @returns {Map<any, any>}
 */
function codeCoverageBadges(pkg, options, cwd) {
  const { nlmOptions = {} } = options;
  const badges = new Map();
  const coverageFile = path.join(cwd, 'coverage/coverage-summary.json');

  const opts = {
    thresholds: [
      [95, 'success'],
      [90, 'green'],
      [75, 'yellow'],
      [50, 'critical'],
    ],
    enable: true,
    ...((nlmOptions.badges && nlmOptions.badges.coverage) || {}),
  };

  if (opts.enable && fs.existsSync(coverageFile)) {
    let result;
    try {
      result = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
      const { pct } = result.total.lines;

      if (pct == null) {
        return badges;
      }

      const color = getCoverageColor(pct, opts.thresholds);

      badges.set('coverage', shieldsBadge('coverage', `${pct}%`, color));
    } catch (e) {
      /**/
    }
  }
  return badges;
}

/**
 * @param {string?} key
 * @returns {RegExp}
 */
function getShieldRegexp(key) {
  // /[\[ !]*\[nlm-[\w\s-_s]+]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)]?(\([\w:\/\-@.%=]+\))?/

  const id = /[\w\s-_s]+/;
  const shieldsUri = /https:\/\/img\.shields\.io\/badge/;
  const message = /[\w\S]+/;
  const color = /\w+/;
  const encoded = /[\w:\/\-@.%=]+/;
  const url = /[\w:\/\-@.%=]+/;

  const label = key ? encode(key) : encoded.source;

  return new RegExp(
    `[\\[ !]*\\[nlm-${id.source}]\\(${shieldsUri.source}\\/${label}-${message.source}-${color.source}\\)]?(\\(${url.source}\\))?`,
    'g'
  );
}

async function generateBadges(cwd, pkg, options) {
  debugStep('generate badges');
  const { nlmOptions = {} } = options;
  debug('badges options', nlmOptions.badges);

  if (nlmOptions.badges && nlmOptions.badges.enable === 'false') {
    return null;
  }

  let content;
  const readmePath = path.join(cwd, 'README.md');

  try {
    content = fs.readFileSync(readmePath, 'utf-8');
  } catch (e) {
    content = '';
  }

  const STARTS_WITH_IMAGE_REGEXP = /^[\[ ]?!\[[\w\s-_s]+]\([\w:\/\-.%=]+\)]?(\([\w:\/\-.%=@]+\))?/;
  const LAST_BADGES_REGEXP = new RegExp(
    `${STARTS_WITH_IMAGE_REGEXP.source}([\\s\\n]*${getShieldRegexp().source})*`,
    'g'
  );

  const badges = new Map([
    ...npmBadges(pkg, options),
    ...codeCoverageBadges(pkg, options, cwd),
    ...metaInfoBadges(pkg, options),
  ]);

  for (const [id, badge] of badges) {
    const shieldRegexp = getShieldRegexp(id);

    // check 1 - badge doesn't exist
    if (!content.includes(badge)) {
      // check 2 - badge is marked with `nlm-` and from shields.io
      if (shieldRegexp.test(content)) {
        // update badge
        content = content.replace(shieldRegexp, badge);
      } else {
        // check 3 - readme starts with an image badge
        if (STARTS_WITH_IMAGE_REGEXP.test(content)) {
          const regexp = LAST_BADGES_REGEXP.test(content)
            ? LAST_BADGES_REGEXP
            : STARTS_WITH_IMAGE_REGEXP;
          // inject badge after previous badge

          content = content.replace(regexp, `$&\n${badge}`);
        } else {
          // prepend badge
          content = `${badge}\n${content}`;
        }
      }
    }
  }

  fs.writeFileSync(readmePath, content);
  return content;
}

module.exports = { generateBadges };
