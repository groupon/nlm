'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mkdir = require('mkdirp');

const { generateBadges } = require('../../lib/steps/readme-badges');

const withFixture = require('../fixture');

describe('badges', () => {
  const dirname = withFixture('ticket-commits');

  beforeEach(() => {
    fs.writeFileSync(path.join(dirname, 'README.md'), `# test`);
  });

  it('creates a README.md when is missing', async () => {
    fs.unlinkSync(path.join(dirname, 'README.md'));

    const pkg = {
      repository: 'usr/proj',
    };

    await generateBadges(dirname, pkg, {});

    assert.ok(fs.existsSync(path.join(dirname, 'README.md')));
  });

  it('leaves README.md unchanged when badges feature disabled in general', async () => {
    const pkg = {
      repository: 'usr/proj',
    };

    await generateBadges(dirname, pkg, {
      nlmOptions: { badges: { enable: false } },
    });

    const readme = fs.readFileSync(path.join(dirname, 'README.md'), 'utf-8');

    assert.strictEqual(readme, '# test');
  });

  it('encodes badge label and message', async () => {
    const pkg = {
      repository: 'usr/proj',
      bugs: {
        'foo-fighter': 'foo@fighter.com',
      },
    };

    const readme = await generateBadges(dirname, pkg, {});

    assert.match(
      readme,
      /\[nlm-foo-fighter]\(https:\/\/img\.shields\.io\/badge\/foo--fighter-foo%40fighter.com-\w+\)/
    );
  });

  it("doesn't duplicate already existing badges", async () => {
    const pkg = {
      repository: 'usr/proj',
      version: '1.0.0',
    };

    const regexp = /!\[nlm-version]\(https:\/\/img\.shields\.io\/badge\/version-1\.0\.0-\w+\)/;

    for (let i = 0; i < 2; i++) {
      await generateBadges(dirname, pkg, {});

      const readme = fs.readFileSync(path.join(dirname, 'README.md'), 'utf-8');

      assert.match(readme, regexp);
      assert.strictEqual(readme.match(regexp).length, 1);
    }
  });

  it('updates existing badges on value change', async () => {
    const pkg = {
      repository: 'usr/proj',
      engines: { node: '12' },
    };

    fs.writeFileSync(
      path.join(dirname, 'README.md'),
      '![nlm-node](https://img.shields.io/badge/node-12-blue)'
    );

    await generateBadges(dirname, { ...pkg, engines: { node: '14' } }, {});
    const readme = fs.readFileSync(path.join(dirname, 'README.md'), 'utf-8');

    const regexp = /!\[nlm-node]\(https:\/\/img\.shields\.io\/badge\/node-14-\w+\)/;

    assert.match(readme, regexp);
    assert.strictEqual(readme.match(regexp).length, 1);
  });

  it('updates version info, when "nextVersion" is passed with the options', async () => {
    const pkg = {
      repository: 'usr/proj',
      version: '1.0.0',
    };
    fs.writeFileSync(
      path.join(dirname, 'README.md'),
      '![nlm-version](https://img.shields.io/badge/version-1.0.0-blue)'
    );

    await generateBadges(dirname, pkg, { nextVersion: '1.0.1' });
    const readme = fs.readFileSync(path.join(dirname, 'README.md'), 'utf-8');

    const regexp = /!\[nlm-version]\(https:\/\/img\.shields\.io\/badge\/version-1\.0\.1-\w+\)/;

    assert.match(readme, regexp);
    assert.strictEqual(readme.match(regexp).length, 1);
  });

  describe('npm badges', () => {
    let pkg;

    beforeEach(() => {
      pkg = {
        repository: 'usr/proj',
        version: '1.0.0',
        engines: {
          yarn: '>=2.0',
          node: '>=8.3',
          npm: '>=6.0',
        },
      };
    });

    it('adds badges for "version" and "engines"', async () => {
      const readme = await generateBadges(dirname, pkg, {});

      assert.match(
        readme,
        /!\[nlm-version]\(https:\/\/img\.shields\.io\/badge\/version-1\.0\.0-\w+\)/
      );

      assert.match(
        readme,
        /!\[nlm-yarn]\(https:\/\/img\.shields\.io\/badge\/yarn-%3E%3D2\.0-\w+\)/
      );

      assert.match(
        readme,
        /!\[nlm-node]\(https:\/\/img\.shields\.io\/badge\/node-%3E%3D8\.3-\w+\)/
      );
      assert.match(
        readme,
        /!\[nlm-npm]\(https:\/\/img\.shields\.io\/badge\/npm-%3E%3D6\.0-\w+\)/
      );
    });

    it('allows customized color', async () => {
      const options = {
        nlmOptions: {
          badges: {
            npm: {
              color: 'red',
            },
          },
        },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /!\[nlm-version]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-red\)/
      );
      assert.match(
        readme,
        /!\[nlm-yarn]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-red\)/
      );
      assert.match(
        readme,
        /!\[nlm-node]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-red\)/
      );
      assert.match(
        readme,
        /!\[nlm-npm]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-red\)/
      );
    });

    it('can be disabled', async () => {
      const options = {
        nlmOptions: {
          badges: {
            npm: {
              enable: false,
            },
          },
        },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.doesNotMatch(
        readme,
        /!\[nlm-version]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)/
      );
    });

    it('handles missing "engines" section', async () => {
      const options = {};
      delete pkg.engines;

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /!\[nlm-version]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)/
      );
      assert.doesNotMatch(
        readme,
        /!\[nlm-yarn]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)/
      );
    });

    it('handles missing "version"', async () => {
      const options = {};
      delete pkg.version;

      const readme = await generateBadges(dirname, pkg, options);

      assert.doesNotMatch(
        readme,
        /!\[nlm-version]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)/
      );
    });
  });

  describe('coverage badge', () => {
    let pkg;

    beforeEach(() => {
      pkg = {
        repository: 'usr/proj',
      };

      mkdir.sync(path.join(dirname, 'coverage'));
      fs.writeFileSync(
        path.join(dirname, 'coverage/coverage-summary.json'),
        JSON.stringify({ total: { lines: { pct: 94 } } })
      );
    });

    it('adds coverage when "coverage/coverage-summary.json" file exist', async () => {
      const options = {};

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /!\[nlm-coverage]\(https:\/\/img\.shields\.io\/badge\/coverage-94%25-\w+\)/
      );
    });

    it('allows customized threshold ranges', async () => {
      const options = {
        nlmOptions: {
          badges: {
            coverage: {
              thresholds: [
                [100, '000'],
                [90, 'red'],
                [50, 'blue'],
              ],
            },
          },
        },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /!\[nlm-coverage]\(https:\/\/img\.shields\.io\/badge\/coverage-94%25-000\)/,
        'matches range 90-100 and set color 000'
      );
    });

    it('allows customized order of threshold ranges', async () => {
      const options = {
        nlmOptions: {
          badges: {
            coverage: {
              thresholds: [
                [90, 'red'],
                [100, '000'],
                [51, 'yellow'],
                [50, 'blue'],
              ],
            },
          },
        },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /!\[nlm-coverage]\(https:\/\/img\.shields\.io\/badge\/coverage-94%25-\w+\)/
      );
    });

    it('allows numbers and strings for threshold ranges', async () => {
      const options = {
        nlmOptions: {
          badges: {
            coverage: {
              thresholds: [
                ['100', '000'],
                [90, 'red'],
                ['50', 'blue'],
              ],
            },
          },
        },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /!\[nlm-coverage]\(https:\/\/img\.shields\.io\/badge\/coverage-94%25-000\)/,
        'matches range 90-100 and set color 000'
      );
    });

    it('can be disabled', async () => {
      const options = {
        nlmOptions: {
          badges: {
            coverage: {
              enable: false,
            },
          },
        },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.doesNotMatch(
        readme,
        /!\[nlm-coverage]\(https:\/\/img\.shields\.io\/badge\/coverage-94%25-\w+\)/
      );
    });

    it('is not added when coverage/coverage-summary.json is missing', async () => {
      fs.unlinkSync(path.join(dirname, 'coverage/coverage-summary.json'));

      const readme = await generateBadges(dirname, pkg, {});

      assert.doesNotMatch(
        readme,
        /!\[nlm-coverage]\(https:\/\/img\.shields\.io\/badge\/coverage-94%25-\w+\)/
      );
    });
  });

  describe('meta info badges', () => {
    let pkg;

    beforeEach(() => {
      pkg = {
        repository: 'usr/proj',
        bugs: {
          url: 'https://jira.mydomain.com/browse/PROJECT',
          chat: 'https://mydomain.slack.com/messages/FOOFIGHTERS/',
          email: 'foo-fighters@mydomain.com',
        },
      };
    });

    it('adds clickable badges for "bugs" section', async () => {
      const options = {};

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /[\[ !]*\[nlm-email]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)]?(\([\w:\/\-@.%=]+\))?/
      );
    });

    it('detects JIRA url', async () => {
      const options = {};

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /\[!\[nlm-jira]\(https:\/\/img\.shields\.io\/badge\/jira-PROJECT-\w+\)](\([\w:\/\-@.%=]+\))/
      );
    });

    it('detects slack channel url', async () => {
      const options = {};

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /\[!\[nlm-slack]\(https:\/\/img\.shields\.io\/badge\/slack-FOOFIGHTERS-\w+\)](\([\w:\/\-@.%=]+\))/
      );
    });

    it('allows disabling urls', async () => {
      const options = {
        nlmOptions: { badges: { meta: { url: false } } },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.doesNotMatch(
        readme,
        /[\[!]\[nlm-email]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)](\([\w:\/\-@.%=]+\))/,
        `doesn\'t include badge w/ url`
      );
      assert.match(
        readme,
        /!\[nlm-email]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)/,
        'includes the badge w/o url'
      );
    });

    it('allows overwriting badge color', async () => {
      const options = {
        nlmOptions: { badges: { meta: { color: 'CCC' } } },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.match(
        readme,
        /[\[ !]*\[nlm-email]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-CCC\)]?(\([\w:\/\-@.%=]+\))?/
      );
    });

    it('badge setting can be disabled', async () => {
      const options = {
        nlmOptions: { badges: { meta: { enable: false } } },
      };

      const readme = await generateBadges(dirname, pkg, options);

      assert.doesNotMatch(
        readme,
        /[\[ !]*\[nlm-email]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)]?(\([\w:\/\-@.%=]+\))?/,
        'badge w/ url'
      );

      assert.doesNotMatch(
        readme,
        /!\[nlm-email]\(https:\/\/img\.shields\.io\/badge\/[\w:\/\-@.%=]+-[\w\S]+-\w+\)/,
        'badge w/o url'
      );
    });
  });
});
