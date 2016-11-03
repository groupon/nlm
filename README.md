# nlm

A tool for automating the release of libraries in the spirit of [semantic-release](https://github.com/semantic-release/semantic-release).

#### Highlights

* Automatically tags pull requests with `semver-{patch,minor,major,none}` based on the commit history
* All information is also part of the git history
* Smart `CHANGELOG.md` generator that incorporates pull request data
* Adds license headers for JavaScript and CoffeeScript files

## Getting Started

### Prerequisites

1. A Github access token with `repo` scope. This is required for creating version commits, releases, and tagging issues. Github has a instructions for [creating an access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/).
1. A valid repository field in your `package.json`. E.g. `https://github.mycorp.net/myorg/repo.git` or `https://github.com/myorg/repo.git`.
1. The repository field should point to an existing project on Github.

### Install `nlm`

1. Run `npm install --save-dev nlm`.
1. Set `publishConfig.registry` in your `package.json` if you haven't already.
1. Set your `posttest` script in `package.json` to `nlm verify`.

### Setting up CI

`nlm` will automatically look for well-known environment variables during CI builds like `CI=true`, `BRANCH=branch-name`, etc..
It should work out-of-the-box for both [Travis](travis-ci.org) and [DotCI](groupon.github.io/DotCi/).

For Github and npm interactions to work,
it requires the following additional environment variables:

* `GH_TOKEN`: The access token from above.
* `NPM_TOKEN`: An npm access token. You can find this in `~/.npmrc` as `_authToken`.

For registries that don't support `_authToken`,
it's possible to configure `NPM_USERNAME`, `NPM_EMAIL`, and `NPM_PASSWORD_BASE64` instead.
Those values can be found in your `~/.npmrc` as `username`, `email`, and `_password`.

All tokens and passwords should be set up as encrypted environment variables.

#### Travis

For Travis you can follow the [official Travis docs](https://docs.travis-ci.com/user/environment-variables/#Encrypted-Variables):

```bash
travis encrypt GH_TOKEN=your_github_token --add env
```

If you want to publish from CI, you can either use the [official Travis feature](https://docs.travis-ci.com/user/deployment/npm/) or `nlm` itself.
The latter gives you support for managing different `dist-tag`s based on branches.

If you want to use `nlm` to publish, you'll have to add `NPM_TOKEN`:

```bash
travis encrypt NPM_TOKEN=your_npm_token --add env
```

#### DotCI

DotCI lacks native support for encrypted environment variables.
But the [EnvInject Plugin](https://wiki.jenkins-ci.org/display/JENKINS/EnvInject+Plugin) provides an option called "Inject passwords to the build as environment variables" which can fill the same role.

You should also enable builds of pull requests for pushes against the same repository. Otherwise the automated tagging of PRs won't work.

Finally enable publishing by adding the following to `.ci.yml`:

```yaml
build:
  <% if (DOTCI_BRANCH == 'master') { %>
  after:
    - ./node_modules/.bin/nlm publish
  <% } %>
```

## Configuration

Most `nlm` configuration happens via native npm options in `package.json`:

* `repository`: This field is parsed to detect Github API baseUrl and repository name.
  `nlm` supports both public Github and Github Enterprise instances.
  For Github Enterprise, it assumes the API to be at `https://<hostname>/api/v3`.
* `files`: By default `nlm` will add license headers to everything listed here.

In most cases these settings are enough to make `nlm` do the right thing.
For more customization, you can use `.nlmrc` or an `nlm` section in `package.json`:

* `channels`: A map of branch name to npm `dist-tag`. When publishing, this will determine what will be published and how it's tagged. By default there's one entry in this map: `{ master: 'latest' }`. Which means that a publish from `master` updates the `latest` tag and publish from any other branch does nothing.
* `license.files`: List of files and/or directories to add license headers to.
* `license.exclude`: List of files to exclude that would otherwise be included. `nlm` will always exclude anything in `node_modules`.
* `acceptInvalidCommits`: Accept commit messages even if they can't be parsed.
  It's highly discouraged to use this option.
  In this mode any commit with an invalid commit message will be treated as "semver-major".

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
1. If there are unreleased changes:
  1. Create a new CHANGELOG entry and update `package.json#version`.
  1. Commit and tag the release.
  1. Push the tag and the release branch (e.g. master).
  1. Create a Github release.
1. Publish the package to npm or update `dist-tag` if required.

By default `nlm release` will not do anything unless it's running on CI.
You can force a release by running `nlm release --commit`.

**Note:** If your current version is below 1.0.0, nlm will always release 1.0.0.
The semantics of versions below 1.0.0 can be tricky
and nlm tries to not make any assumptions about how people might interpret those version ranges.


### `nlm changelog`

Preview the changelog that would be generated by the commits between the last version tag and the current `HEAD`.
If there are no unreleased commits, the output will be empty.
