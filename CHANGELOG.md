### 2.2.0

* Link to issues and tickets in changelog - **[@jkrems](https://github.com/jkrems)** [#9](https://github.com/groupon/nlm/pull/9)
  - [`2a834ba`](https://github.com/groupon/nlm/commit/2a834baf6cb04b80b4e4ce28df1f16a6a37c686e) **feat:** Support parsing full issue urls
  - [`73da2d3`](https://github.com/groupon/nlm/commit/73da2d39e92de70d238f60ffd34dbd071564bc48) **feat:** Link to issues and tickets in changelog - see: [#8](https://github.com/groupon/nlm/issues/8)


### 2.1.1

* Handle missing and foreign PRs in changelog - **[@jkrems](https://github.com/jkrems)** [#15](https://github.com/groupon/nlm/pull/15)
  - [`b8ca6e0`](https://github.com/groupon/nlm/commit/b8ca6e093426d035e6eb9a10c574d28e0332628b) **fix:** Handle missing and foreign PRs in changelog


### 2.1.0

* Opt-in `acceptInvalidCommits` option - **[@jkrems](https://github.com/jkrems)** [#12](https://github.com/groupon/nlm/pull/12)
  - [`e16eb35`](https://github.com/groupon/nlm/commit/e16eb35fedc528a3ff2f0421fb5477ffba64e34a) **feat:** Opt-in `acceptInvalidCommits` option


### 2.0.2

* Never publish private packages - **[@jkrems](https://github.com/jkrems)** [#11](https://github.com/groupon/nlm/pull/11)
  - [`d727cb6`](https://github.com/groupon/nlm/commit/d727cb66be940fb225d0b24baf7c1b82179f6f68) **fix:** Never publish private packages


### 2.0.1

* fix: Call publishToNpm as a task/step - **[@jkrems](https://github.com/jkrems)** [#7](https://github.com/groupon/nlm/pull/7)
  - [`b981991`](https://github.com/groupon/nlm/commit/b981991f3d3f56f79b68238d87c5eefada048ae1) **fix:** Call publishToNpm as a task/step


### 2.0.0

#### Breaking Changes

The `publish` command was removed and merged with
the `release` command. To better support projects with multiple
builds (e.g. against multiple versions of node) the release parts
were split from the verification parts. `nlm verify` can be used
as a `posttest` script in those cases. This ensures that multiple
builds won't try to release the same version.

*See: [`a8ce7e9`](https://github.com/groupon/nlm/commit/a8ce7e931fd50450cf258f48d5dbae7ea83e9ca2)*

#### Commits

* Support matrix builds - **[@jkrems](https://github.com/jkrems)** [#4](https://github.com/groupon/nlm/pull/4)
  - [`05d9171`](https://github.com/groupon/nlm/commit/05d917102cfcfeff69a315247517e343e58b5f1b) **fix:** Read the commit sha from the right directory
  - [`a8ce7e9`](https://github.com/groupon/nlm/commit/a8ce7e931fd50450cf258f48d5dbae7ea83e9ca2) **feat:** Officially support matrix builds
* Pass arguments to verify command - **[@jkrems](https://github.com/jkrems)** [#6](https://github.com/groupon/nlm/pull/6)
  - [`fd38f44`](https://github.com/groupon/nlm/commit/fd38f44cd3219a4bbf888daeac6086092c903f7f) **fix:** Pass arguments to verify command


### 1.1.0

* Compatible with node v0.10 - **[@jkrems](https://github.com/jkrems)** [#3](https://github.com/groupon/nlm/pull/3)
  - [`981c75c`](https://github.com/groupon/nlm/commit/981c75ca9b2f8b673c98e5e1361b1d6d38e41af3) **fix:** Support latest git's error message
  - [`c843504`](https://github.com/groupon/nlm/commit/c843504beae229a2816de052ae98a77b4ce7a0cc) **feat:** Test suite passes on node 0.10
  - [`321ce61`](https://github.com/groupon/nlm/commit/321ce61870b19821500a3bd53e6be57f1308debd) **test:** Set git user/email in fixtures


### 1.0.1

* fix: Reference local bin script for publish - **[@jkrems](https://github.com/jkrems)** [#2](https://github.com/groupon/nlm/pull/2)
  - [`94b594b`](https://github.com/groupon/nlm/commit/94b594be97198b85e69a8f7e69c819325d5326b6) **fix:** Reference local bin script for publish


### 1.0.0

* [`e233526`](https://github.com/groupon/nlm/commit/e23352659b22df859fddebc40595df269668789b) **chore:** Initial import
* [`c8ea5cb`](https://github.com/groupon/nlm/commit/c8ea5cb80d317677c4c64e675df120e3a8bb6580) **chore:** Add travis config
* [`ded085d`](https://github.com/groupon/nlm/commit/ded085d883d33615654a6ff33e9c10224eafeef9) **feat:** Run nlm build with DEBUG enabled
* [`6d1b9e1`](https://github.com/groupon/nlm/commit/6d1b9e1ee296f039d04c0eb39930b36aa75b3f4f) **fix:** Explicitly push version commit
