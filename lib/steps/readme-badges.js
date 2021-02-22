'use strict';

const path = require('path');
const fs = require('fs');

function getLastPath(url) {
  if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return new URL(url).pathname.split('/').pop();
}

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

function npmBadges(pkg, options) {
  const { nlmOptions = {} } = options;

  const opts = {
    color: 'blue',
    enable: true,
    ...((nlmOptions.badges && nlmOptions.badges.npm) || {}),
  };

  return Object.entries({
    version: options.nextVersion || pkg.version,
    ...pkg.engines,
  }).reduce((acc, [key, value]) => {
    acc.set(key, shieldsBadge(key, value, opts.color));
    return acc;
  }, new Map());
}

function metaInfoBadges(pkg, options) {
  const { nlmOptions } = options;
  const badges = new Map();

  const opts = {
    color: 'F4D03F',
    enable: true,
    url: true,
    ...((nlmOptions.badges && nlmOptions.badges.meta) || {}),
  };

  return opts.enable && pkg.bugs && pkg.bugs
    ? Object.entries(pkg.bugs).reduce((acc, [key, value]) => {
        const data = extractUrl(key, value);
        const badge = shieldsBadge(data.key, data.value, opts.color);
        acc.set(data.key, opts.url ? `[${badge}](${data.url})` : badge);
        return acc;
      }, badges)
    : badges;
}

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

function codeCoverageBadges(pkg, options, cwd) {
  const { nlmOptions } = options;
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

      const color = getCoverageColor(pct, opts.thresholds);

      badges.set('coverage', shieldsBadge('coverage', `${pct}%`, color));
    } catch (e) {
      /**/
    }
  }
  return badges;
}

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
  let content;
  const readmePath = path.join(cwd, 'README.md');

  try {
    content = fs.readFileSync(readmePath, 'utf-8');
  } catch (e) {
    return;
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
}

module.exports = { generateBadges };
