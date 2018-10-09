### 3.3.4

* Keep package-lock in sync - **[@jkrems](https://github.com/jkrems)** [#44](https://github.com/groupon/nlm/pull/44)
  - [`f40a4f7`](https://github.com/groupon/nlm/commit/f40a4f78882f7f60426b08385dc980a82c2bf132) **chore:** Keep package-lock in sync


### 3.3.3

* Protect merge commit fix by ref id - **[@jkrems](https://github.com/jkrems)** [#43](https://github.com/groupon/nlm/pull/43)
  - [`0b5d1a6`](https://github.com/groupon/nlm/commit/0b5d1a63c6ff1d0fd6356f3a6c0f586bc44ad00f) **fix:** Protect merge commit fix by ref id


### 3.3.2

* fix: address npm audit security report - **[@markowsiak](https://github.com/markowsiak)** [#42](https://github.com/groupon/nlm/pull/42)
  - [`4fdd017`](https://github.com/groupon/nlm/commit/4fdd0175b10d78cc8fafa5d6a38988f8a1411e03) **fix:** address npm audit security report
  - [`5bb4c5b`](https://github.com/groupon/nlm/commit/5bb4c5b5b746fdf6e441336898b741614a1c92b6) **refactor:** update conventional-commits-parser and accomodate for change in behavior
  - [`16b3816`](https://github.com/groupon/nlm/commit/16b381641ad99920d2ccc1dfa926fa417d3826c9) **chore:** apply latest generator updates
  - [`f6aa03f`](https://github.com/groupon/nlm/commit/f6aa03fed0d55510d26c8e7cef528fe1279cb038) **fix:** remove nlm recurssive dep, and fix references
  - [`655b379`](https://github.com/groupon/nlm/commit/655b3797557cde63c7376e2c2ba1107ebfd52c67) **fix:** generator added npm6 install for travis
  - [`983e7f5`](https://github.com/groupon/nlm/commit/983e7f5b1baa607c837d31dcdb44ccbfbfdaa320) **refactor:** improve regex finding issuePrefixes by URL
  - [`85bd9d1`](https://github.com/groupon/nlm/commit/85bd9d14d510b835c302f4cf2951cd7e094a5fc2) **fix:** make regex more inclusive and future proof


### 3.3.1

* Apply latest nlm generator - **[@markowsiak](https://github.com/markowsiak)** [#40](https://github.com/groupon/nlm/pull/40)
  - [`45d4c15`](https://github.com/groupon/nlm/commit/45d4c15b796d9a8171b5a84aa112b76ab76cd6a6) **chore:** Apply latest nlm generator
* fix: failed nlm deploy - **[@markowsiak](https://github.com/markowsiak)** [#41](https://github.com/groupon/nlm/pull/41)
  - [`bb9caa2`](https://github.com/groupon/nlm/commit/bb9caa294eb156e5946361e139c37deb31a54df5) **fix:** failed nlm deploy


### 3.3.0

* acceptInvalidCommits formatter - **[@johan](https://github.com/johan)** [#38](https://github.com/groupon/nlm/pull/38)
  - [`0ec2a0e`](https://github.com/groupon/nlm/commit/0ec2a0ebdbd1cc13beffb569490f0aaabc2ef439) **test:** check formatting of off-format commit messages
  - [`5e39a6a`](https://github.com/groupon/nlm/commit/5e39a6a4f3cf68740d848024763bfe4745817f15) **feat:** properly link even off-format commit messages - see: [#16](https://github.com/groupon/nlm/issues/16)


### 3.2.0

* Add predictable git author - **[@jkrems](https://github.com/jkrems)** [#36](https://github.com/groupon/nlm/pull/36)
  - [`e941fda`](https://github.com/groupon/nlm/commit/e941fda04eee9743d48059ff913060c38d39bad4) **feat:** Add predictable git author


### 3.1.5

* fix: properly parse repositories with dot in name - **[@dbushong](https://github.com/dbushong)** [#34](https://github.com/groupon/nlm/pull/34)
  - [`4672e13`](https://github.com/groupon/nlm/commit/4672e131764ba5a77a9ed0a21f8fe9581c253cfd) **fix:** properly parse repositories with dot in name


### 3.1.4

* Skip verify in non-git directories - **[@jkrems](https://github.com/jkrems)** [#33](https://github.com/groupon/nlm/pull/33)
  - [`e8bdf99`](https://github.com/groupon/nlm/commit/e8bdf9925fda31ec01fe4943d49908b00363d8fd) **fix:** Skip verify in non-git directories


### 3.1.3

* fix: properly accept `perf` commit prefix as patch - **[@dbushong](https://github.com/dbushong)** [#32](https://github.com/groupon/nlm/pull/32)
  - [`ab3dd21`](https://github.com/groupon/nlm/commit/ab3dd21ce7b2dcc2e7a4861d4554e63bd1d64494) **fix:** properly accept `perf` commit prefix as patch


### 3.1.2

* Mention forced 1.0.0 bump - **[@jkrems](https://github.com/jkrems)** [#30](https://github.com/groupon/nlm/pull/30)
  - [`db6e715`](https://github.com/groupon/nlm/commit/db6e7150f2eb28fe80b0eccab3f40d79eb5175aa) **docs:** Mention forced 1.0.0 bump


### 3.1.1

* Only scan for files if LICENSE is present - **[@jkrems](https://github.com/jkrems)** [#29](https://github.com/groupon/nlm/pull/29)
  - [`f78b9dc`](https://github.com/groupon/nlm/commit/f78b9dcd9a9510650459410700fdd53fb14ddd96) **fix:** Only scan for files if LICENSE is present


### 3.1.0

* feat: re-check publish status for releaseType none - **[@dbushong](https://github.com/dbushong)** [#27](https://github.com/groupon/nlm/pull/27)
  - [`724d23e`](https://github.com/groupon/nlm/commit/724d23e6445a6e78f91a90bc13b3a507b1c6ac39) **feat:** re-check publish status for releaseType none


### 3.0.0

#### Breaking Changes

Since nobody uses it in practice and yeoman is a
better fit anyhow, we're removing the init command from nlm.

*See: [`f09b2eb`](https://github.com/groupon/nlm/commit/f09b2eb996f0e159371763dba1df79af818e48d0)*

#### Commits

* Remove `nlm init` - **[@jkrems](https://github.com/jkrems)** [#23](https://github.com/groupon/nlm/pull/23)
  - [`f09b2eb`](https://github.com/groupon/nlm/commit/f09b2eb996f0e159371763dba1df79af818e48d0) **refactor:** Remove init command


### 2.2.3

* fix: correct spelling - **[@dbushong](https://github.com/dbushong)** [#26](https://github.com/groupon/nlm/pull/26)
  - [`3027f2f`](https://github.com/groupon/nlm/commit/3027f2fe8600a7782037ff3bf988ae4e624cf8c1) **fix:** correct spelling


### 2.2.2

* Switch to gofer 3 - **[@jkrems](https://github.com/jkrems)** [#22](https://github.com/groupon/nlm/pull/22)
  - [`488057e`](https://github.com/groupon/nlm/commit/488057e5b851c45c67b7d67ebcc3b38dc2e46f37) **chore:** Switch to gofer 3


### 2.2.1

* Apply latest nlm generator - **[@i-tier-bot](https://github.com/i-tier-bot)** [#20](https://github.com/groupon/nlm/pull/20)
  - [`05a2980`](https://github.com/groupon/nlm/commit/05a298095657805b8174632fca4b1f7c03301aab) **chore:** Apply latest nlm generator
  - [`6f07328`](https://github.com/groupon/nlm/commit/6f073286a02387b2e7111cfae7981a8eb6341b62) **chore:** nlm should not require nlm
  - [`0201798`](https://github.com/groupon/nlm/commit/0201798949a951cbb6c010f0e1009564db18afb7) **fix:** Lodash 4 merged pluck into map
* Fix typo in travis config - **[@jkrems](https://github.com/jkrems)** [#21](https://github.com/groupon/nlm/pull/21)
  - [`42c5b71`](https://github.com/groupon/nlm/commit/42c5b71fcbbdc473e030d8c00323925b56dc78aa) **chore:** Fix typo in travis config


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
