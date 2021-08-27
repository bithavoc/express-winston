## 4.2.0
* Upgraded lodash to 4.17.21 minimum ([#264](https://github.com/bithavoc/express-winston/issues/264))
* Fixed typos and Readme format ([#262](https://github.com/bithavoc/express-winston/pull/262))

## 4.1.0
* Update chalk and lodash due minor security impact ([#252](https://github.com/bithavoc/express-winston/pull/252))
* Allow filter out whitelisted request body ([#258](https://github.com/bithavoc/express-winston/pull/258))
* Fix metaField/requestField/responseField typescript types ([#259](https://github.com/bithavoc/express-winston/pull/259))

## 4.0.5

* Fix excess semicolon breaking Typescript compilation ([#249](https://github.com/bithavoc/express-winston/pull/249))

## 4.0.4
* Update lodash to 4.17.19 ([#245](https://github.com/bithavoc/express-winston/pull/245))
* Update statusLevels to accept Boolean or StatusLevel object in TypeScript definition ([#244](https://github.com/bithavoc/express-winston/pull/244))

## 4.0.3
* Update lodash to 4.17.15 ([#232](https://github.com/bithavoc/express-winston/pull/232))
* Add missing exceptionToMeta and skip to TypeScript definition ([#234](https://github.com/bithavoc/express-winston/pull/234))

## 4.0.2
* Add blacklist fields to BaseErrorLoggerOptions interface ([#230](https://github.com/bithavoc/express-winston/pull/230))

## 4.0.1
* Added `headerBlacklist` to BaseLoggerOptions for better typescript support ([#228](https://github.com/bithavoc/express-winston/pull/228))

## 4.0.0
* Changed `metaField` configuration property functionality (see Readme.md) ([#209](https://github.com/bithavoc/express-winston/issues/209)) - BREAKING CHANGE
* Moved type definitions to be embedded inside library ([#123](https://github.com/bithavoc/express-winston/issues/123))
* Added "files" to package.json to reduce unnecessary files in released package
* Added StackDriver/Google Cloud Logging specific instructions to Readme.md
* Added `requestField` and `responseField` options to allow storing the request and response in different metadata fields (or not at all) 
* Fixed `meta` configuration option on `errorLogger` (was not functioning at all)
* Added .editorconfig and reformatted library to match

## 3.4.0
* Added: Nested Whitelists ([#225](https://github.com/bithavoc/express-winston/pull/225), @kapalex)

## 3.3.0
* Added: options.headerBlacklist ([#217](https://github.com/bithavoc/express-winston/pull/217), @maxday)

## 3.2.1
* Added: options.skip ([#214](https://github.com/bithavoc/express-winston/pull/214), [#147](https://github.com/bithavoc/express-winston/pull/147), @ahnkee)

## 3.2.0
* Replaced: _header -> getHeader ([#210](https://github.com/bithavoc/express-winston/pull/210), @Gregoirevda)
* Replaced coverage tool blanket with nyc ([#211](https://github.com/bithavoc/express-winston/pull/211), @golopot)
* Add eslint and fix lint errors ([#212](https://github.com/bithavoc/express-winston/pull/212), @golopot)

## 3.1.0
* Fix large _.template memory consumption ([#203](https://github.com/bithavoc/express-winston/pull/203), @slickmb)

## 3.0.1
* Add `format` to `options` to allow user-specified formatting following winston@3 conventions ([#190](https://github.com/bithavoc/express-winston/pull/190), @crellison)

## 3.0.0
express-winston@3 shouldn't have any breaking changes _of its own_, but there are breaking changes as a result of upgrading winston and Node.js.

express-winston@2.6.0 will be the last version to support winston@2.

#### Breaking changes
* Drop support for winston < 3. winston@3 includes quite a few breaking changes. Check their [changelog](https://github.com/winstonjs/winston/blob/master/CHANGELOG.md) and [upgrade guide](https://github.com/winstonjs/winston/blob/master/UPGRADE-3.0.md) to get an idea of winston's breaking changes.
* Drop support for Node.js < 6. v6 is the oldest version of Node.js [currently supported by the Node.js team](https://github.com/nodejs/Release).

## 2.6.0
* Add `exceptionToMeta` and `blacklistedMetaFields` for filtering returned meta
  object ([#173](https://github.com/bithavoc/express-winston/pull/173), @cubbuk)

## 2.5.1
* Allow `msg` to be a function ([#160](https://github.com/bithavoc/express-winston/pull/160), @brendancwood)

## 2.5.0
* Reduce memory usage ([#164](https://github.com/bithavoc/express-winston/pull/164), @Kmaschta)

## 2.4.0
* Allow `options.level` to be a function for dynamic level setting ([#148](https://github.com/bithavoc/express-winston/pull/148), @CryptArchy)

## 2.3.0
* Allow line breaks inside `msg` interpolation ([#143](https://github.com/bithavoc/express-winston/pull/143), @ltegman)

## 2.2.0
* Add dynamic metadata support to error logger ([#139](https://github.com/bithavoc/express-winston/issues/139), @scarlettsteph)

## 2.1.3
* Re-enable logging of req.body when request whitelist contains body and there is no no body whitelist/blacklist (broken in 2.1.1) ([#136](https://github.com/bithavoc/express-winston/issues/136))

## 2.1.2
* Fix error throwing when no req is logged ([#130](https://github.com/bithavoc/express-winston/issues/130))

## 2.1.1
* Fix `bodyBlacklist` not working when `requestWhitelist` contains `body` ([#128](https://github.com/bithavoc/express-winston/issues/128), @jacobcabantomski-ct)

## 2.1.0
* Add dynamic metadata support ([#124](https://github.com/bithavoc/express-winston/issues/124), @jpdelima)
* Add support for `colorize`-ing status code, no `expressFormat` required ([#121](https://github.com/bithavoc/express-winston/issues/121))

## 2.0.0
#### Breaking changes
* Make winston a peer dependency. `npm install --save winston` if you haven't already.
* `expressFormat` has no color by default. Add `colorize: true` to express-winston
  options to enable the previous colorized output. ([#86](https://github.com/bithavoc/express-winston/issues/86))
* Drop support for inherited properties on the object provided to the `baseMeta` option. This is unlikely to actually break anyone's real-world setup.

## 1.4.2
* Upgrade winston to 1.1 ([#114](https://github.com/bithavoc/express-winston/issues/114))

## 1.4.1
* Don't throw exception on invalid JSON in response body ([#112](https://github.com/bithavoc/express-winston/issues/112))

## 1.4.0
* Allow custom log level for error logger ([#111](https://github.com/bithavoc/express-winston/pull/111))

## 1.3.1
* underscore -> lodash ([#88](https://github.com/bithavoc/express-winston/issues/88))

## 1.3.0
* Allow custom status levels ([#102](https://github.com/bithavoc/express-winston/pull/102))
* Add per-instance equivalents of all global white/blacklists ([#105](https://github.com/bithavoc/express-winston/pull/105))
* Allow user to override module-level whitelists and functions without having to worry about using the right object reference ([#92](https://github.com/bithavoc/express-winston/issues/92))

## 1.2.0
* Add `baseMeta` and `metaField` options ([#91](https://github.com/bithavoc/express-winston/pull/91))
* Document `requestFilter` and `responseFilter` options
* Drop support for node 0.6 and 0.8
