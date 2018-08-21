var util = require('util');

var mocks = require('node-mocks-http');
var should = require('should');
var _ = require('lodash');
var winston = require('winston');
var Transport = require('winston-transport');

var expressWinston = require('../index.js');

expressWinston.ignoredRoutes.push('/ignored');
expressWinston.responseWhitelist.push('body');
expressWinston.bodyBlacklist.push('potato');

class MockTransport extends Transport {
  constructor(test, options) {
    super(options || {});

    this._test = test;
    this._test.transportInvoked = false;
  }

  log(info, cb) {
    this._test.transportInvoked = true;
    this._test.log.level = info.level;
    this._test.log.msg = info.message;
    this._test.log.meta = info.meta;
    this.emit('logged');
    return cb();
  }
}

function mockReq(reqMock) {
  var reqSpec = _.extend({
    method: 'GET',
    url: '/hello',
    headers: {
      'header-1': 'value 1'
    },
    query: {
      val: '1'
    },
    params: {
      id: 20
    },
  }, reqMock);

  return mocks.createRequest(reqSpec);
}

function mockRes() {
  var res = mocks.createResponse();
  res.status(200);
  return res;
}

function loggerTestHelper(providedOptions) {
  var options = _.extend({
    loggerOptions: null,
    req: null,
    res: null,
    transportOptions: null,
    next: function (req, res, next) {
      res.end('{ "message": "Hi!  I\'m a chunk!" }');
    }
  }, providedOptions);

  var req = mockReq(options.req);
  var res = _.extend(mockRes(), options.res);

  var result = {
    req: req,
    res: res,
    log: {}
  };

  return new Promise(function (resolve, reject) {
    var middleware = expressWinston.logger(_.extend({
      transports: [new MockTransport(result, options.transportOptions)]
    }, options.loggerOptions));

    middleware(req, res, function (_req, _res, next) {
      options.next(req, res, next);
      resolve(result);
    });
  });
}

function errorLoggerTestHelper(providedOptions) {
  var options = _.extend({
    loggerOptions: null,
    originalError: new Error('This is the Error'),
    req: null,
    res: null,
    transportOptions: null,
    next: function () {}
  }, providedOptions);

  var req = mockReq(options.req);
  var res = _.extend(mockRes(), options.res);

  var result = {
    req: req,
    res: res,
    log: {},
    originalError: options.originalError,
    pipelineError: null
  };

  return new Promise(function (resolve, reject) {
    var middleware = expressWinston.errorLogger(_.extend({
      transports: [new MockTransport(result, options.transportOptions)]
    }, options.loggerOptions));

    middleware(options.originalError, req, res, function (pipelineError) {
      options.next(pipelineError);
      result.pipelineError = pipelineError;
      resolve(result);
    });
  });
}

describe('express-winston', function () {

  describe('.errorLogger()', function () {
    it('should be a function', function () {
      expressWinston.errorLogger.should.be.a.Function();
    });

    it('should throw an error when no options are provided', function () {
      var errorLoggerFn = expressWinston.errorLogger.bind(expressWinston);
      errorLoggerFn.should.throw();
    });

    it('should throw an error when no transport is specified', function () {
      var errorLoggerFn = expressWinston.errorLogger.bind(expressWinston, {});
      errorLoggerFn.should.throw();
    });

    it('should throw an error when provided with an empty list of transports', function () {
      var errorLoggerFn = expressWinston.errorLogger.bind(expressWinston, {
        transports: []
      });
      errorLoggerFn.should.throw();
    });

    it('should return a middleware function with four arguments that fit (err, req, res, next)', function () {
      var middleware = expressWinston.errorLogger({
        transports: [new MockTransport({})]
      });

      middleware.length.should.eql(4);
    });

    it('should use the exported requestWhitelist', function() {
      var originalWhitelist = expressWinston.requestWhitelist;
      expressWinston.requestWhitelist = ['foo'];

      var options = {
        req: {foo: "bar"}
      };
      return errorLoggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.requestWhitelist = originalWhitelist;

        result.log.meta.req.should.have.property('foo');
        result.log.meta.req.should.not.have.property('url');
      });
    });

    it('should use the exported defaultRequestFilter', function() {
      var originalRequestFilter = expressWinston.defaultRequestFilter;
      expressWinston.defaultRequestFilter = function() {
        return 'foo';
      };

      var options = {
        req: {foo: "bar"}
      };
      return errorLoggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.defaultRequestFilter = originalRequestFilter;

        result.log.meta.req.url.should.equal('foo');
      });
    });

    describe('when middleware function encounters an error in the pipeline', function () {
      it('should invoke the transport', function () {
        return errorLoggerTestHelper().then(function (result) {
          result.transportInvoked.should.eql(true);
        });
      });

      it('should find the default level of "error"', function () {
        return errorLoggerTestHelper().then(function (result) {
          result.log.level.should.eql('error');
        });
      });

      it('should find a custom level of "warn"', function () {
        var testHelperOptions = {loggerOptions: {level:'warn'}};
        return errorLoggerTestHelper(testHelperOptions).then(function (result) {
          result.log.level.should.eql('warn');
        });
      });

      it('should find a message of "middlewareError"', function () {
        return errorLoggerTestHelper().then(function (result) {
          result.log.msg.should.eql('middlewareError');
        });
      });

      it('should contain a filtered request', function () {
        return errorLoggerTestHelper().then(function (result) {
          result.log.meta.req.should.be.ok();
          result.log.meta.req.method.should.eql('GET');
          result.log.meta.req.query.should.eql({
            val: '1'
          });

          result.log.meta.req.should.not.have.property('nonWhitelistedProperty');
        });
      });

      it('should not swallow the pipeline error', function () {
        return errorLoggerTestHelper().then(function (result) {
          result.pipelineError.should.be.ok();
          result.pipelineError.should.eql(result.originalError);
        });
      });
    });

    describe('exceptionToMeta option', function () {
      it('should, use exceptionToMeta function when given', function () {
        function exceptionToMeta(error) {
          return {
            stack: error.stack && error.stack.split('\n')
          };
        }

        var testHelperOptions = { loggerOptions: { exceptionToMeta: exceptionToMeta } };
        return errorLoggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.stack.should.be.ok();
          result.log.meta.should.not.have.property('trace');
        });
      });

      it('should, use getAllInfo function when not given', function () {
        var testHelperOptions = { loggerOptions: { } };
        return errorLoggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.should.have.property('date');
          result.log.meta.should.have.property('process');
          result.log.meta.should.have.property('os');
          result.log.meta.should.have.property('trace');
          result.log.meta.should.have.property('stack');
        });
      });
    });

    describe('blacklistedMetaFields option', function () {
      it('should, remove given fields from the meta result', function () {
        var testHelperOptionsWithBlacklist = { loggerOptions: { blacklistedMetaFields: ['trace'] } };
        return errorLoggerTestHelper(testHelperOptionsWithBlacklist).then(function (result) {
          result.log.meta.should.not.have.property('trace');
        });

        var testHelperOptionsWithoutBlacklist = { loggerOptions: {} };
        return errorLoggerTestHelper(testHelperOptionsWithoutBlacklist).then(function (result) {
          result.log.meta.should.have.property('trace');
        });
      });
    });

    describe('metaField option', function () {
      it('should, when using a custom metaField, log the custom metaField', function () {
        var testHelperOptions = {loggerOptions: {metaField: 'metaField'}};
        return errorLoggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.metaField.req.should.be.ok();
        });
      });
    });

    describe('requestWhitelist option', function () {
      it('should default to global requestWhitelist', function () {
        var options = {
          req: {foo: "bar"}
        };
        return errorLoggerTestHelper(options).then(function (result) {
          result.log.meta.req.should.not.have.property('foo');
        });
      });

      it('should use specified requestWhitelist', function () {
        var options = {
          req: {foo: "bar"},
          loggerOptions: {
            requestWhitelist: ['foo']
          }
        };
        return errorLoggerTestHelper(options).then(function (result) {
          result.log.meta.req.should.have.property('foo');
          result.log.meta.req.should.not.have.property('method');
        });
      });
    });

    describe('dynamicMeta option', function () {
      var testHelperOptions = {
        req: {
          body: {
            age: 42,
            potato: 'Russet'
          },
          user: {
            username: "john@doe.com",
            role: "operator"
          }
        },
        res: {
          custom: 'custom response runtime field'
        },
        originalError: new Error('FOO'),
        loggerOptions: {
          meta: true,
          dynamicMeta: function(req, res, err) {
            return {
              user: req.user.username,
              role: req.user.role,
              custom: res.custom,
              errMessage: err.message
            }
          }
        }
      };

      it('should contain dynamic meta data if meta and dynamicMeta activated', function () {
        return errorLoggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.req.should.be.ok();
          result.log.meta.user.should.equal('john@doe.com');
          result.log.meta.role.should.equal('operator');
          result.log.meta.custom.should.equal('custom response runtime field');
          result.log.meta.errMessage.should.equal('FOO');
        });
      });

      it('should work with metaField option', function () {
        testHelperOptions.loggerOptions.metaField = 'metaField';
        return errorLoggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.metaField.req.should.be.ok();
          result.log.meta.metaField.user.should.equal('john@doe.com');
          result.log.meta.metaField.role.should.equal('operator');
          result.log.meta.metaField.custom.should.equal('custom response runtime field');
          result.log.meta.metaField.errMessage.should.equal('FOO');
        });
      });

      it('should not contain dynamic meta data if dynamicMeta activated but meta false', function () {
        testHelperOptions.loggerOptions.meta = false;
        return errorLoggerTestHelper(testHelperOptions).then(function (result) {
          should.not.exist(result.log.meta.req);
          should.not.exist(result.log.meta.user);
          should.not.exist(result.log.meta.role);
          should.not.exist(result.log.meta.custom);
          should.not.exist(result.log.meta.errMessage);
        });
      });

      it('should throw an error if dynamicMeta is not a function', function () {
        var loggerFn = expressWinston.errorLogger.bind(expressWinston, {dynamicMeta: 12});
        loggerFn.should.throw();
      });
    });
  });

  describe('.logger()', function () {
    it('should be a function', function () {
      expressWinston.logger.should.be.a.Function();
    });

    it('should throw an error when no options are provided', function () {
      var loggerFn = expressWinston.logger.bind(expressWinston);
      loggerFn.should.throw();
    });

    it('should throw an error when no transport is specified', function () {
      var loggerFn = expressWinston.logger.bind(expressWinston, {});
      loggerFn.should.throw();
    });

    it('should throw an error when provided with an empty list of transports', function () {
      var loggerFn = expressWinston.logger.bind(expressWinston, {
        transports: []
      });
      loggerFn.should.throw();
    });

    it('should return a middleware function with three arguments that fit (req, res, next)', function () {
      var middleware = expressWinston.logger({
        transports: [new MockTransport({})]
      });

      middleware.length.should.eql(3);
    });

    it('should not have an empty body in meta.req when invoked on a route with an empty response body', function () {
      function next(req, res, next) {
        res.end();
      }
      var testHelperOptions = {
        next: next,
        req: {
          body: {},
          routeLevelAddedProperty: 'value that should be logged',
          url: '/hello'
        },
      };
      return loggerTestHelper(testHelperOptions).then(function (result) {
        Object.keys(result.log.meta.req).indexOf('body').should.eql(-1);
      });
    });

    it('should log entire body when request whitelist contains body and there is no body whitelist or blacklist', function () {
      function next(req, res, next) {
        res.end();
      }
      var testHelperOptions = {
        next: next,
        req: {
          body: {
            foo: 'bar',
            baz: 'qux'
          },
          routeLevelAddedProperty: 'value that should be logged',
          url: '/hello'
        },
        loggerOptions: {
          bodyBlacklist: [],
          bodyWhitelist: [],
          requestWhitelist: expressWinston.requestWhitelist.concat('body')
        }
      };
      return loggerTestHelper(testHelperOptions).then(function (result) {
        result.log.meta.req.body.should.eql({
          foo: 'bar',
          baz: 'qux'
        });
      });
    });

    it('should not invoke the transport when invoked on a route with transport level of "error"', function () {
      function next(req, res, next) {
        req._routeWhitelists.req = ['routeLevelAddedProperty'];
        req._routeWhitelists.res = ['routeLevelAddedProperty'];

        res.end('{ "message": "Hi!  I\'m a chunk!" }');
      }
      var testHelperOptions = {
        next: next,
        loggerOptions: {
          statusLevels: true
        },
        req: {
          body: {},
          routeLevelAddedProperty: 'value that should be logged',
          url: '/hello',
        },
        res: {
          nonWhitelistedProperty: 'value that should not be logged',
          routeLevelAddedProperty: 'value that should be logged'
        },
        transportOptions: {
          level: 'error'
        }
      };
      return loggerTestHelper(testHelperOptions).then(function (result) {
        result.transportInvoked.should.eql(false);
      });
    });

    it('should use the exported requestWhitelist', function() {
      var originalWhitelist = expressWinston.requestWhitelist;
      expressWinston.requestWhitelist = ['foo'];

      var options = {
        req: {foo: "bar"}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.requestWhitelist = originalWhitelist;

        result.log.meta.req.should.have.property('foo');
        result.log.meta.req.should.not.have.property('url');
      });
    });

    it('should use the exported bodyWhitelist', function() {
      var originalWhitelist = expressWinston.bodyWhitelist;
      expressWinston.bodyWhitelist = ['foo'];

      var options = {
        req: {body: {foo: 'bar', baz: 'qux'}}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.bodyWhitelist = originalWhitelist;

        result.log.meta.req.body.should.have.property('foo');
        result.log.meta.req.body.should.not.have.property('baz');
      });
    });

    it('should use the exported bodyBlacklist', function() {
      var originalBlacklist = expressWinston.bodyBlacklist;
      expressWinston.bodyBlacklist = ['foo'];

      var options = {
        req: {body: {foo: 'bar', baz: 'qux'}}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.bodyBlacklist = originalBlacklist;

        result.log.meta.req.body.should.not.have.property('foo');
        result.log.meta.req.body.should.have.property('baz');
      });
    });

    it('should use the exported responseWhitelist', function() {
      var originalWhitelist = expressWinston.responseWhitelist;
      expressWinston.responseWhitelist = ['foo'];

      var options = {
        res: {foo: 'bar', baz: 'qux'}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.responseWhitelist = originalWhitelist;

        result.log.meta.res.should.have.property('foo');
        result.log.meta.res.should.not.have.property('baz');
      });
    });

    it('should use the exported defaultRequestFilter', function() {
      var originalRequestFilter = expressWinston.defaultRequestFilter;
      expressWinston.defaultRequestFilter = function() {
        return 'foo';
      };

      var options = {
        req: {foo: "bar"}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.defaultRequestFilter = originalRequestFilter;

        result.log.meta.req.url.should.equal('foo');
      });
    });

    it('should use the exported defaultResponseFilter', function() {
      var originalResponseFilter = expressWinston.defaultResponseFilter;
      expressWinston.defaultResponseFilter = function() {
        return 'foo';
      };

      var options = {
        req: {foo: "bar"}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.defaultResponseFilter = originalResponseFilter;

        result.log.meta.res.statusCode.should.equal('foo');
      });
    });

    it('should use the exported defaultSkip', function() {
      var originalSkip = expressWinston.defaultSkip;
      expressWinston.defaultSkip = function() {
        return true;
      };

      var options = {
        req: {foo: "bar"}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.defaultSkip = originalSkip;

        result.transportInvoked.should.eql(false);
      });
    });

    it('should use the exported ignoredRoutes', function() {
      var originalIgnoredRoutes = expressWinston.ignoredRoutes;
      expressWinston.ignoredRoutes = ['/foo-route'];

      var options = {
        req: {url: '/foo-route'}
      };
      return loggerTestHelper(options).then(function (result) {
        // Return to the original value for later tests
        expressWinston.ignoredRoutes = originalIgnoredRoutes;

        result.transportInvoked.should.eql(false);
      });
    });

    describe('when middleware function is invoked on a route', function () {
      function next(req, res, next) {
        req._startTime = (new Date()) - 125;

        req._routeWhitelists.req = ['routeLevelAddedProperty'];
        req._routeWhitelists.res = ['routeLevelAddedProperty'];

        req._routeWhitelists.body = ['username'];
        req._routeBlacklists.body = ['age'];

        res.end('{ "message": "Hi!  I\'m a chunk!" }');
      }
      var testHelperOptions = {
        next: next,
        req: {
          body: {
            username: "bobby",
            password: "top-secret",
            age: 42,
            potato: 'Russet'
          },
          routeLevelAddedProperty: 'value that should be logged'
        },
        res: {
          nonWhitelistedProperty: 'value that should not be logged',
          routeLevelAddedProperty: 'value that should be logged'
        },
      };

      it('should invoke the transport', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.transportInvoked.should.eql(true);
        });
      });

      it('should contain a filtered request', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.req.should.be.ok();
          result.log.meta.req.method.should.eql('GET');
          result.log.meta.req.query.should.eql({
            val: '1'
          });

          result.log.meta.req.body.should.not.have.property('age');
          result.log.meta.req.body.should.not.have.property('potato');
        });
      });

      it('should contain a filtered response', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.res.should.be.ok();

          result.log.meta.res.statusCode.should.eql(200);
          result.log.meta.res.routeLevelAddedProperty.should.be.ok();

          result.log.meta.res.should.not.have.property('nonWhitelistedProperty');
        });
      });

      it('should contain a response time', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.responseTime.should.be.within(120, 130);
        });
      });
    });

    describe('when middleware function is invoked on a route that returns JSON', function() {
      it('should parse JSON in response body', function() {
        var bodyObject = { "message": "Hi!  I\'m a chunk!" };
        function next(req, res, next) {
          // Set Content-Type in a couple different case types, just in case.
          // Seems like the mock response doesn't quite handle the case
          // translation on these right.
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(bodyObject));
        }
        return loggerTestHelper({next: next}).then(function(result) {
            result.log.meta.res.body.should.eql(bodyObject);
        });
      });

      it('should not blow up when response body is invalid JSON', function() {
        function next(req, res, next) {
          // Set Content-Type in a couple different case types, just in case.
          // Seems like the mock response doesn't quite handle the case
          // translation on these right.
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('content-type', 'application/json');
          res.end('}');
        }
        return loggerTestHelper({next: next});
      });
    });

    describe('when middleware function is invoked on a route that should be ignored (by .ignoredRoutes)', function () {
      var testHelperOptions = {
        req: {url: '/ignored'}
      };

      it('should not invoke the transport', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.transportInvoked.should.eql(false);
        });
      });

      it('should contain a filtered request', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.should.be.empty();
        });
      });
    });

    describe('expressFormat option', function () {
      it('should match the Express format when logging', function () {
        var testHelperOptions = {
          loggerOptions: {
            colorize: true,
            expressFormat: true
          },
          req: {
            url: '/all-the-things'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          var resultMsg = result.log.msg;
          resultMsg.should.startWith('\u001b[90mGET /all-the-things\u001b[39m \u001b[32m200\u001b[39m \u001b[90m');
          resultMsg.should.endWith('ms\u001b[39m');
        });
      });

      it('should not emit colors when colorize option is false', function() {
        var testHelperOptions = {
          loggerOptions: {
            colorize: false,
            expressFormat: true
          },
          req: {
            url: '/all-the-things'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          var resultMsg = result.log.msg;
          resultMsg.should.startWith('GET /all-the-things 200 ');
          resultMsg.should.endWith('ms');
        });
      });

      it('should not emit colors when colorize option is not present', function() {
        var testHelperOptions = {
          loggerOptions: {
            colorize: false,
            expressFormat: true
          },
          req: {
            url: '/all-the-things'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          var resultMsg = result.log.msg;
          resultMsg.should.startWith('GET /all-the-things 200 ');
          resultMsg.should.endWith('ms');
        });
      });
    });

    describe('colorize option', function () {
      it('should make status code text green if < 300', function () {
        var testHelperOptions = {
          loggerOptions: {
            colorize: true,
            msg: '{{res.statusCode}} {{req.method}} {{req.url}}'
          },
          req: {
            url: '/all-the-things'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          var resultMsg = result.log.msg;
          resultMsg.should.eql('\u001b[32m200\u001b[39m GET /all-the-things');
        });
      });

      it('should make status code text cyan if >= 300 and < 400', function () {
        var testHelperOptions = {
          loggerOptions: {
            colorize: true,
            msg: '{{res.statusCode}} {{req.method}} {{req.url}}'
          },
          req: {
            url: '/all-the-things'
          },
          res: {
            statusCode: 302
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          var resultMsg = result.log.msg;
          resultMsg.should.eql('\u001b[36m302\u001b[39m GET /all-the-things');
        });
      });

      it('should make status code text yellow if >= 400 and < 500', function () {
        var testHelperOptions = {
          loggerOptions: {
            colorize: true,
            msg: '{{res.statusCode}} {{req.method}} {{req.url}}'
          },
          req: {
            url: '/all-the-things'
          },
          res: {
            statusCode: 420
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          var resultMsg = result.log.msg;
          resultMsg.should.eql('\u001b[33m420\u001b[39m GET /all-the-things');
        });
      });

      it('should make status code text red if >= 500', function () {
        var testHelperOptions = {
          loggerOptions: {
            colorize: true,
            msg: '{{res.statusCode}} {{req.method}} {{req.url}}'
          },
          req: {
            url: '/all-the-things'
          },
          res: {
            statusCode: 500
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          var resultMsg = result.log.msg;
          resultMsg.should.eql('\u001b[31m500\u001b[39m GET /all-the-things');
        });
      });
    });

    describe('msg option', function () {
      it('should have a default log msg', function () {
        var testHelperOptions = {
          req: {
            url: '/url-of-sandwich'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.msg.should.eql('HTTP GET /url-of-sandwich');
        });
      });

      it('should match the custom format when a custom format is provided', function () {
        var testHelperOptions = {
          loggerOptions: {
            msg: 'Foo {{ req.method }} {{ req.url }}'
          },
          req: {
            url: '/all-the-things'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.msg.should.eql('Foo GET /all-the-things');
        });
      });
    });

    describe('ignoreRoute option', function () {
      var testHelperOptions = {
        req: {
          shouldSkip: true,
          url: '/is-not-logged'
        },
        loggerOptions: {
          ignoreRoute: function (req, res) {
            return req.shouldSkip === true && req.url.match(/^\/is-not-log/);
          }
        }
      };

      it('should throw an error if ignoreRoute option is provided but not a function', function () {
        var loggerFn = expressWinston.logger.bind(expressWinston, {
          transports: [new MockTransport({})],
          ignoreRoute: 'not a function'
        });
        loggerFn.should.throw();
      });

      it('should not invoke the transport when invoked on a route that should be ignored', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.transportInvoked.should.eql(false);
        });
      });

      it('should contain a filtered request when invoked on a route that should be ignored', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.should.be.empty();
        });
      });
    });

    describe('metaField option', function () {
      it('should have a default meta field', function () {
        return loggerTestHelper().then(function (result) {
          result.log.meta.req.should.be.ok();
        });
      });

      it('should use provided custom metaField', function () {
        var testHelperOptions = {
          loggerOptions: {
            metaField: 'foobar'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.foobar.req.should.be.ok();
        });
      });
    });

    describe('skip option', function () {
      it('should not be logged when using custom function returning true', function () {
        var testHelperOptions = {
          loggerOptions: {
            skip: function (req, res) {
              return req.url.indexOf('sandwich') != -1
            }
          },
          req: {
            url: '/url-of-sandwich'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          should.not.exist(result.log.msg);
        });
      });

      it('should be logged when using custom function returning false', function () {
        var testHelperOptions = {
          loggerOptions: {
            skip: function (req, res) {
              return req.url.indexOf('sandwich') != -1
            }
          },
          req: {
            url: '/hello'
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.msg.should.eql('HTTP GET /hello');
        });
      });
    });

    describe('statusLevels option', function () {
      it('should have status level of "info" by default', function () {
        var testHelperOptions = {
          next: function (req, res, next) {
            res.status(403).end('{ "message": "Hi!  I\'m a chunk!" }');
          }
        };
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.level.should.equal('info');
        });
      });

      describe('when statusLevels set to true', function () {
        it('should have status level of "info" when 100 <= statusCode < 400', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(200).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              statusLevels: true
            },
            req: {
              url: '/url-of-sandwich'
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('info');
          });
        });

        it('should have status level of "warn" when 400 <= statusCode < 500', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(403).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              statusLevels: true
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('warn');
          });
        });

        it('should have status level of "error" when statusCode >= 500', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(500).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              statusLevels: true
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('error');
          });
        });
      });

      describe('when statusLevels set to an object', function () {
        it('should have custom status level provided by "success" key of object when 100 <= statusCode < 400', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(200).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              statusLevels: {success: 'silly'}
            },
            transportOptions: {
              level: 'silly'
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('silly');
          });
        });

        it('should have status level provided by "warn" key of object when 400 <= statusCode < 500', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(403).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              statusLevels: {warn: 'debug'}
            },
            transportOptions: {
              level: 'silly'
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('debug');
          });
        });

        it('should have status level provided by "error" key of object when statusCode >= 500', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(500).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              statusLevels: {error: 'verbose'}
            },
            transportOptions: {
              level: 'silly'
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('verbose');
          });
        });
      });
    });

    describe('when levels set to a function', function () {
        it('should have custom status level provided by the function when 100 <= statusCode < 400', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(200).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              level: function(req,res) { return 'silly'; }
            },
            transportOptions: {
              level: 'silly'
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('silly');
          });
        });

        it('should have custom status level provided by the function when 400 <= statusCode < 500', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(403).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              level: function(req,res) { return 'silly'; }
            },
            transportOptions: {
              level: 'silly'
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('silly');
          });
        });

        it('should have custom status level provided by the function when 500 <= statusCode', function () {
          var testHelperOptions = {
            next: function (req, res, next) {
              res.status(500).end('{ "message": "Hi!  I\'m a chunk!" }');
            },
            loggerOptions: {
              level: function(req,res) { return 'silly'; }
            },
            transportOptions: {
              level: 'silly'
            }
          };
          return loggerTestHelper(testHelperOptions).then(function (result) {
            result.log.level.should.equal('silly');
          });
        });
    });

    describe('requestWhitelist option', function () {
      it('should default to global requestWhitelist', function () {
        var options = {
          req: {foo: "bar"}
        };
        return loggerTestHelper(options).then(function (result) {
          result.log.meta.req.should.not.have.property('foo');
        });
      });

      it('should use specified requestWhitelist', function () {
        var options = {
          req: {foo: "bar"},
          loggerOptions: {
            requestWhitelist: ['foo']
          }
        };
        return loggerTestHelper(options).then(function (result) {
          result.log.meta.req.should.have.property('foo');
          result.log.meta.req.should.not.have.property('method');
        });
      });

      it('should not include a req in the log when there is no request whitelist', function() {
        var options = {
          loggerOptions: {
            requestWhitelist: [],
          }
        };
        return loggerTestHelper(options).then(function (result) {
          should.not.exist(result.log.meta.req);
        });
      });
    });

    describe('bodyBlacklist option', function () {
      it('should remove the body if it is requestWhitelisted and the bodyBlacklist removes all properties', function() {
        var options = {
          loggerOptions: {
            bodyBlacklist: ['foo', 'baz'],
            requestWhitelist: ['body'],
          },
          req: {
            body: {foo: 'bar', baz: 'qux'}
          }
        };
        return loggerTestHelper(options).then(function (result) {
          result.log.meta.req.should.not.have.property('body');
        });
      });
    });

    describe('responseWhitelist option', function () {
      it('should default to global responseWhitelist', function () {
        var options = {
          res: {foo: "bar"}
        };
        return loggerTestHelper(options).then(function (result) {
          result.log.meta.res.should.not.have.property('foo');
        });
      });

      it('should use specified responseWhitelist', function () {
        var options = {
          res: {foo: "bar"},
          loggerOptions: {
            responseWhitelist: ['foo']
          }
        };
        return loggerTestHelper(options).then(function (result) {
          result.log.meta.res.should.have.property('foo');
          result.log.meta.res.should.not.have.property('method');
        });
      });
    });

    describe('ignoredRoutes option', function () {
      it('should default to global ignoredRoutes', function () {
        var options = {
          req: {url: "/ignored"}
        };
        return loggerTestHelper(options).then(function (result) {
          result.transportInvoked.should.eql(false);
        });
      });

      it('should use specified ignoredRoutes', function () {
        var options = {
          req: {url: "/ignored-option"},
          loggerOptions: {
            ignoredRoutes: ['/ignored-option']
          }
        };
        return loggerTestHelper(options).then(function (result) {
          result.transportInvoked.should.eql(false);
        });
      });
    });

    describe('dynamicMeta option', function () {
      var testHelperOptions = {
        req: {
          body: {
            age: 42,
            potato: 'Russet'
          },
          user: {
            username: "john@doe.com",
            role: "operator"
          }
        },
        res: {
          custom: 'custom response runtime field'
        },
        loggerOptions: {
          meta: true,
          dynamicMeta: function(req, res) {
            return {
              user: req.user.username,
              role: req.user.role,
              custom: res.custom
            }
          }
        }
      };

      it('should contain dynamic meta data if meta and dynamicMeta activated', function () {
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.req.should.be.ok();
          result.log.meta.user.should.equal('john@doe.com');
          result.log.meta.role.should.equal('operator');
          result.log.meta.custom.should.equal('custom response runtime field');
        });
      });

      it('should work with metaField option', function () {
        testHelperOptions.loggerOptions.metaField = 'metaField';
        return loggerTestHelper(testHelperOptions).then(function (result) {
          result.log.meta.metaField.req.should.be.ok();
          result.log.meta.metaField.user.should.equal('john@doe.com');
          result.log.meta.metaField.role.should.equal('operator');
          result.log.meta.metaField.custom.should.equal('custom response runtime field');
        });
      });

      it('should not contain dynamic meta data if dynamicMeta activated but meta false', function () {
        testHelperOptions.loggerOptions.meta = false;
        return loggerTestHelper(testHelperOptions).then(function (result) {
          should.not.exist(result.log.meta.req);
          should.not.exist(result.log.meta.user);
          should.not.exist(result.log.meta.role);
          should.not.exist(result.log.meta.custom);
        });
      });

      it('should throw an error if dynamicMeta is not a function', function () {
        var loggerFn = expressWinston.logger.bind(expressWinston, {dynamicMeta: 12});
        loggerFn.should.throw();
      });
    });
  });

  describe('.requestWhitelist', function () {
    it('should be an array with all the properties whitelisted in the req object', function () {
      expressWinston.requestWhitelist.should.be.an.Array();
    });
  });

  describe('.bodyWhitelist', function () {
    it('should be an array with all the properties whitelisted in the body object', function () {
      expressWinston.bodyWhitelist.should.be.an.Array();
    });
  });

  describe('.bodyBlacklist', function () {

  });

  describe('.responseWhitelist', function () {
    it('should be an array with all the properties whitelisted in the res object', function () {
      expressWinston.responseWhitelist.should.be.an.Array();
    });
  });

  describe('.defaultRequestFilter', function () {
    it('should be a function', function () {
      expressWinston.defaultRequestFilter.should.be.a.Function();
    });
  });

  describe('.defaultResponseFilter', function () {
    it('should be a function', function () {
      expressWinston.defaultResponseFilter.should.be.a.Function();
    });
  });

  describe('.defaultSkip', function () {
    it('should be a function', function () {
      expressWinston.defaultSkip.should.be.a.Function();
    });
  });

  describe('.ignoredRoutes', function () {
    it('should be an array for all the ignored routes', function () {
      expressWinston.ignoredRoutes.should.be.an.Array();
    });
  });
});
