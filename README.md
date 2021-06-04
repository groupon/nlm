![GitHub](https://github.com/groupon/nlm/actions/workflows/node.js.yml/badge.svg?branch=main)
![nlm-coverage](https://img.shields.io/badge/coverage-57.64%25-yellow?logo=coverage&logoColor=white)
![nlm-version](https://img.shields.io/badge/version-5.5.0-blue?logo=version&logoColor=white)
![nlm-node](https://img.shields.io/badge/node-%3E%3D10.13-blue?logo=node.js&logoColor=white)
[![nlm-github](https://img.shields.io/badge/github-groupon%2Fnlm%2Fissues-F4D03F?logo=github&logoColor=white)](https://github.com/groupon/nlm/issues)
# nlm

A tool for automating the release of libraries in the spirit of 
[semantic-release](https://github.com/semantic-release/semantic-release). For a list of supported commit types and their affect on the version, see [CONTRIBUTING.md](CONTRIBUTING.md).

#### Highlights

* Automatically tags pull requests with `semver-{patch,minor,major,none}` based on the commit history
* All information is also part of the git history
* Smart `CHANGELOG.md` generator that incorporates pull request data
* Adds license headers for JavaScript and CoffeeScript files

## Getting Started

### Prerequisites

1. A GitHub access token with `repo` scope. This is required for creating version commits, releases, 
and tagging issues. GitHub has instructions for 
[creating an access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/).
1. A valid repository field in your `package.json`. E.g. `https://github.mycorp.net/myorg/repo.git` or 
`https://github.com/myorg/repo.git`.
1. The repository field should point to an existing project on GitHub.

### Install `nlm`

1. Run `npm install --save-dev nlm`.
1. Set `publishConfig.registry` in your `package.json` if you haven't already.
1. Set your `posttest` script in `package.json` to `nlm verify`.

### Setting up CI

`nlm` will automatically look for well-known environment variables during CI
builds like `CI=true`, `BRANCH=branch-name`, etc.
It should work out-of-the-box for [Travis](https://travis-ci.org/),
[DotCI](https://groupon.github.io/DotCi/), and [CircleCI](https://circleci.com/).

For GitHub and npm interactions to work, it requires the following additional environment variables:

* `GH_TOKEN`: The access token from above.
* `NPM_TOKEN`: An npm access token. You can find this in `~/.npmrc` as `_authToken`.

For registries that don't support `_authToken`,
it's possible to configure `NPM_USERNAME`, `NPM_EMAIL`, and `NPM_PASSWORD_BASE64` instead.
Those values can be found in your `~/.npmrc` as `username`, `email`, and `_password`.

All tokens and passwords should be set up as encrypted environment variables.

#### Travis

For Travis, you can follow the 
[official Travis docs](https://docs.travis-ci.com/user/environment-variables/#Encrypted-Variables):

```bash
travis encrypt GH_TOKEN=your_github_token --add env
```

If you want to publish from CI, you can either use the 
[official Travis feature](https://docs.travis-ci.com/user/deployment/npm/) or `nlm` itself.
The latter gives you support for managing different `dist-tag`s based on branches.

If you want to use `nlm` to publish, you'll have to add `NPM_TOKEN`:

```bash
travis encrypt NPM_TOKEN=your_npm_token --add env
```

#### CircleCI

You may reference the official [circleci docs](https://circleci.com/docs/2.0/env-vars/) on setting up environment variables
using the admin console.

`nlm` will look for `CIRCLE_BRANCH` and `CIRCLE_PULL_REQUEST` environment variables to operate correctly.

To enable publishing, you may add a check in your run steps for a branch and build you want to release on:

```yaml
- run: |
    if [ "$CIRCLE_BRANCH" == "master" ] && [ "$CIRCLE_STAGE" == "test-3" ]; then
          echo "Running nlm release";
          npx nlm release;
    else
          echo "Not running nlm release!";
    fi
```


#### GitHub Actions

Running `nlm` with GitHub Actions requires small modifications to the default GH actions templates, as well as setting
up the `NPM_TOKEN` secret.


###### Workflow: Run CI
The template below is almost the same as the default one. The only difference is that `on.push:` is left empty, 
so the action will trigger on every push on every branch. 

<details><summary><strong>Click to open</strong>: workflows/node.js.yml</summary>
<p>

```yaml
# This workflow will do a clean install of node dependencies, build the source code and run tests across different versions of node
# For more information see: https://help.github.com/actions/language-and-framework-guides/using-nodejs-with-github-actions

name: Node.js CI

on:
  push: # leave events empty so they triggers in every branch

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [10.x, 12.x, 14.x]

    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v2
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test
```
</p>
</details>

**NOTE**: With the setup above, If you are using `nlm verify` in the package `posttest` script, 
`verify` will state that the changes are `none`.  You can either ignore this, or set `fetch-depth: 0` in 
the checkout step to fetch the full git history.

```yaml
- uses: actions/checkout@v2
    with:
      fetch-depth: 0
```

###### Workflow: Tagging PRs

Tagging the PR with `nlm` requires

- the `pull_request` event, so a PR id can be determined
- `GH_TOKEN` to be passed to the environment
  ```yaml
  env:
    GH_TOKEN: ${{secrets.GITHUB_TOKEN}}
  ```
- the entire git history. Set `fetch-depth: 0` to overwrite the default in `actions/checkout@v2`
  ```yaml
  # see https://github.com/actions/checkout#fetch-all-history-for-all-tags-and-branches
  - uses: actions/checkout@v2
    with:
      fetch-depth: 0
  ```

<details><summary><strong>Click to open</strong>: workflows/tag-pr.yml</summary>
<p>

```yaml
name: NLM

on:
  pull_request:

jobs:
  tag:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0  # necessary to get full commit history
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: 14
      - run: npm ci
      - run: npx nlm verify
        env:
          GH_TOKEN: ${{secrets.GITHUB_TOKEN}}
```
</p>
</details>

###### Workflow: Releasing with nlm

To have `nlm` release on merge to the default branch or other branches, you need to 
- set the trigger to the `push` event
  ```yaml
  push:
    branches: [ main, v10.x ] # branches to release from
  ```
- pass the `GH_TOKEN` and `NPM_TOKEN` to the env
  ```yaml
  - run: npx nlm release  # nlm release command
    env:
    GH_TOKEN: ${{secrets.GITHUB_TOKEN}}
    NPM_TOKEN: ${{secrets.NPM_TOKEN}}
  ```
- the entire git history. Set `fetch-depth: 0` to overwrite the default in `actions/checkout@v2`
  ```yaml
  # see https://github.com/actions/checkout#fetch-all-history-for-all-tags-and-branches
  - uses: actions/checkout@v2
    with:
      fetch-depth: 0
  ```

<details><summary><strong>Click to open</strong>: workflows/npm-publish.yml</summary>
<p>

```yaml
name: Publish to NPM

on:
  push:
    branches: [ main ] # default branch

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 14
      - run: npm ci
      - run: npm test

  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0 # necessary to get full commit history
      - uses: actions/setup-node@v2
        with:
          node-version: 14
          
      - run: npm ci
      - run: npx nlm release  # nlm release command
        env:
          GH_TOKEN: ${{secrets.GITHUB_TOKEN}} # pass GH_TOKEN
          NPM_TOKEN: ${{secrets.NPM_TOKEN}}   # pass NPM_TOKEN.
```
</p>
</details>


**Creating Secrets**

The above templates show two secrets passed to the `env` environment.
By default, the `GITHUB_TOKEN` secret exists in every repo and doesn't need to be set to the repository or org secrets.
The `NPM_TOKEN` on the contrary, needs to set to the org or repository secrets. 
It becomes available to the workflow on the `secrets` object

See [Official GitHub Documentation](https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-an-environment)
on how to set a secret.



## Configuration

Most `nlm` configuration happens via native npm options in `package.json`:

* `repository`: This field is parsed to detect GitHub API baseUrl and repository name.
  `nlm` supports both public GitHub and GitHub Enterprise instances.
  For GitHub Enterprise, it assumes the API to be at `https://<hostname>/api/v3`.
* `files`: By default `nlm` will add license headers to everything listed here.

In most cases these settings are enough to make `nlm` do the right thing.
For more customization, you can use `.nlmrc` or an `nlm` section in `package.json`:

* channels`: A map of branch name to npm `dist-tag`. When publishing, this will determine what will be published and
how it's tagged. By default, there's two entries in this map: `{ master: 'latest', main: 'latest' }`. Which means that
publishing from `master` or `main` updates the `latest` tag and publishing from any other branch does nothing.
* `hooks`: A map of hook names to shell commands. When executing any of the [commands](#commands) 
listed below some of these hooks will get triggered. The available hooks are:

Hook      | Description
--------- | -----------
`prepare` | Called when the release is about to be prepared. This is before updating files such as 
package.json, CHANGELOG.md and pushing a commit. It provides a reference to the **next version** number 
via the environment variable **NLM_NEXT_VERSION**.
```ts
interface NlmOptions {
  acceptInvalidCommits?: boolean;
  changelog: { 
    omit?: string[], 
    verbose?: boolean 
  };
  deprecated?: boolean;
  emoji?: {
    skip?: boolean
    set?: {[type: string]: string}
  };
  badges?: {
    enable?: boolean | true
    npm : {
      enable?: boolean | true, 
      color?: string | 'blue'
    }
    meta: {
      enable?: boolean | true,
      color?: string | 'F4D03F', 
      url?: boolean | true
    }
    coverage: {
      enable?: boolean | true, 
      thresholds?: [number, string][] | [[95, 'success'], [90, 'green'], [75, 'yellow'], [50, 'critical']]
    }
  }
  license?: { 
    files?: string[], 
    exclude?: string[] 
  }
}
```

* `license`:
  * `files`: List of files and/or directories to add license headers to.
  * `exclude`: List of files to exclude that would otherwise be included. `nlm` will always exclude 
anything in `node_modules`.
* `acceptInvalidCommits`: Accept commit messages even if they can't be parsed.
  It's highly discouraged to use this option.
  In this mode any commit with an invalid commit message will be treated as "semver-major".
* `deprecated`: String (may be empty) describing reason this package has been
    deprecated.  To deprecate a package, set it to a descriptive reason.
    To "un-deprecate" a package, set it to an empty string (can then be later deleted).
* `changelog`:
  * `omit`: Array of types, which will be omitted from the changelog.
  * `verbose`: Display PR's commits. Default: `false`  
* `emoji`:
  Configure changelog emoji setting logic
  * `skip`: deactivates emoji in changelog. Default: `null`
  * `set`: Custom emojis map, which will overwrite the default one

##### Example for emoji 
```json5
{
  "nlm": {
    "emoji": { 
      "set": {
        "refactor": "🔥" // will overwrite the existing setting for "refactor" type
      }
    }
  } 
}   
```

The default emojis for the commit types are:
```json5
{

  "breaking": "💥",
  "feat": "🚀",
  "fix": "🐛",
  "perf": "⚡",
  "refactor": "📦️",
  "revert": "↩️",
  "docs": "📝",
  "style": "💅",
  
  // internal types
  "dep": "🔼",     // will be set when dependencies are found in PR commit subject
  "internal": "🏡", // will be set for types: "chore", "build", "test", "ci" or commits without type

}
```

#### badges 
Sets shield.io badges to the README.md

```json5
{
  "nlm": {
    "badges": {
      "enable": true,
      "npm": {
        "enable": false,
        "color": "yellow"
      },
      "coverage": {
        "enable": true,
        "thresholds": [[75, "blue"], [50, "yellow"]]
      },
      "meta": {
        "enable": true,
        "url": false,
        "color": "CCC"
      }
    }
  } 
}   
```
* `badges.enable`: enables setting badges to the README. Default: `true`

##### section: `badges.npm`
set package `version` and `engine` information
* `badges.npm.enable`: enables setting npm related badges. Default: `true`
* `badges.npm.color`: custom color set as HEX value (without `#`) or color literals listed on [shields.io](https://shields.io). Default: `blue`

##### section: `badges.coverage`
set coverage information badge given `coverage/coverage-summary.json` exists
* `badges.coverageenable`: enables coverage badge. Default: `true`
* `badges.coveragethresholds`: List of threshold/color ranges. Default: `[95, 'success'], [90, 'green'], [75, 'yellow'], [50, 'critical']`

##### section: `badges.meta`
adds badges for entries in `bugs` section. Can detect JIRA and Slack urls.
* `badges.metaenable`: enables meta badges. Default: `true`
* `badges.metaurl`: makes meta badges clickable. Default: `true`
* `badges.metacolor`: custom color set as HEX value (without `#`) or color literals listed on [shields.io](https://shields.io). Default: `F4D03F`




If there's no file named `LICENSE` in the repository, `nlm` won't attempt to add the headers.

## Commands

### `nlm verify`

*Intended use: `posttest` script for matrix builds.*

Verify that the current state is valid and could be released.
Will also add license headers where they are missing.

1. Add missing license headers.
1. Verify that the checkout is clean.
1. Collect change log items and determine what kind of change it is.

### `nlm release`

*Intended use: `deploy` script, or `posttest` script if not running matrix builds.*

Verify that the current state is valid and could be released.
Will also add license headers where they are missing.

1. Everything `nlm verify` does.
1. If `hooks#prepare` is present in the `nlm` section of the `package.json`, the shell command defined by 
the hook will be executed.
1. If there are unreleased changes:
  1. Create a new CHANGELOG entry and update `package.json#version`.
  1. Commit and tag the release.
  1. Push the tag, and the release branch (e.g. master).
  1. Create a GitHub release.
1. Publish the package to npm or update `dist-tag` if required.

By default `nlm release` will not do anything unless it's running on CI.
You can force a release by running `nlm release --commit`.

**Note:** If your current version is below 1.0.0, nlm will always release 1.0.0.
The semantics of versions below 1.0.0 can be tricky
and nlm tries to not make any assumptions about how people might interpret those version ranges.


### `nlm changelog`

Preview the changelog that would be generated by the commits between the last version tag and the 
current `HEAD`.
If there are no unreleased commits, the output will be empty.
