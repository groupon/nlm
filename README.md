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
1. Enter the Github token when prompted. This will be used to create the required labels on the repository.
1. `nlm` will offer to write the proper `posttest` script if your repository doesn't contain one yet. It will also write a `publishConfig.registry` field, defaulting to your current npm registry setting.

After this you should have `nlm release` in your `posttest` script and 4 `semver-*` labels in your Github project.

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

Then add the following to your `.travis.yml`:

```yaml
after_success: "./node_modules/.bin/nlm publish"
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

If there's no file named `LICENSE` in the repository, `nlm` won't attempt to add the headers.

## Commands

### `nlm init`

*Intended use: Run once in a project.*

Parses an existing `package.json` and makes changes to support `nlm`.

1. Ask for a Github API token.
1. Add the `semver-patch`, `semver-minor`, and `semver-major` labels.
1. Add `nlm release` as a `posttest` script.
1. Set `publishConfig.registry` (default: read from npm config).


### `nlm changelog`

Preview the changelog that would be generated by the commits between the last version tag and the current `HEAD`.
If there are no unreleased commits, the output will be empty.


### `nlm release`

*Intended use: `posttest` script.*

Verify that the current state is valid and could be released.
Will also add license headers where they are missing.

1. Add missing license headers
1. Verify that the checkout is clean
1. Collect change log items and determine what kind of change it is

If this is ran as part of a CI build of the release branch (e.g. `master`),
it will create a new release based on the changes since the last version.
This includes creating and pushing a new git tag.


### `nlm publish`

*Intended use: Publish a released version.*

This is only for cases where you can't use Travis' native support
for publishing packages. It will create a temporary `.npmrc` file
and check if any npm interactions are required.

If it's running on CI (or started with `--commit`), it will then
proceed and actually publish to npm.
