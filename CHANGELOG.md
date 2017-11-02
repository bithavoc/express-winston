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
