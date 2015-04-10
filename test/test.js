var should = require('should');
var util = require('util');
var _ = require('underscore');

var mocks = require('node-mocks-http');
var winston = require('winston');

var expressWinston = require('../index.js');

expressWinston.ignoredRoutes.push('/ignored');
expressWinston.responseWhitelist.push('body');

expressWinston.bodyBlacklist.push('potato');

var MockTransport = function (test, options) {
  test.transportInvoked = false;

  winston.Transport.call(this, options || {});

  this.log = function (level, msg, meta, cb) {
    test.transportInvoked = true;
    test.log.level = level;
    test.log.msg = msg;
    test.log.meta = meta;
    this.emit('logged');
    return cb();
  };
};
util.inherits(MockTransport, winston.Transport);

var req = {};
var res = {};

var setUp = function (options) {
  options = options || {};

  var reqSpec = {
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
  };

  if (options.body) reqSpec.body = options.body;

  if (options.ignoreRoute) reqSpec.url = '/ignored';
  if (options.url) reqSpec.url = options.url;

  req = mocks.createRequest(reqSpec);

  req.route = {
    path: reqSpec.url,
    methods: {
      get: true
    }
  };

  if (options.routePath) req.route.path = options.routePath;

  res = mocks.createResponse();
  res.status(200);
};

describe('expressWinston', function () {
  it('should contain an array with all the properties whitelisted in the req object', function () {
    expressWinston.requestWhitelist.should.be.an.Array;
  });

  it('should contain an array with all the properties whitelisted in the res object', function () {
    expressWinston.responseWhitelist.should.be.an.Array;
  });

  it('should contain an array for all the ignored routes', function () {
    expressWinston.ignoredRoutes.should.be.an.Array;
  });

  it('should contain an array with all the properties whitelisted in the body object', function () {
    expressWinston.bodyWhitelist.should.be.an.Array;
  });

  it('should contain a default request filter function', function () {
    expressWinston.defaultRequestFilter.should.be.a.Function;
  });

  it('should contain a default response filter function', function () {
    expressWinston.defaultResponseFilter.should.be.a.Function;
  });

  it('should contain a default skip function', function () {
    expressWinston.defaultSkip.should.be.a.Function;
  });

  it('should export a function for the creation of request logger middlewares', function () {
    expressWinston.logger.should.be.a.Function;
  });

  describe('.errorLogger()', function () {
    it('should be a function', function () {
      expressWinston.errorLogger.should.be.a.Function;
    });

    it('should throw an error without options', function () {
      (function () {
        expressWinston.errorLogger();
      }).should.throwError();
    });

    it('should throw an error without any transport specified', function () {
      (function () {
        expressWinston.errorLogger({});
      }).should.throwError();
    });

    it('should throw an error with an empty list of transports', function () {
      (function () {
        expressWinston.errorLogger({
          transports: []
        });
      }).should.throwError();
    });

    it('should return a middleware function with four arguments that fit (err, req, res, next)', function () {
      var middleware = expressWinston.errorLogger({
        transports: [new MockTransport({})]
      });

      middleware.length.should.eql(4);
    });

    describe('errorLogger() middleware()', function () {
      var result;

      before(function (done) {
        setUp();

        var originalError = new Error('This is the Error');

        var test = {
          req: req,
          res: res,
          log: {},
          originalError: originalError,
          pipelineError: null
        };

        function next(pipelineError) {
          test.pipelineError = pipelineError;

          result = test;

          return done();
        };

        var middleware = expressWinston.errorLogger({
          transports: [new MockTransport(test)]
        });

        middleware(originalError, req, res, next);
      });

      describe('encountering an error in the pipeline', function () {
        it('should invoke the transport', function () {
          result.transportInvoked.should.eql(true);
        });

        it('should find an error level of "error"', function () {
          result.log.level.should.eql('error');
        });

        it('should find a message of "middlewareError"', function () {
          result.log.msg.should.eql('middlewareError');
        });

        it('should contain a filtered request', function () {
          result.log.meta.req.should.be.ok;
          result.log.meta.req.method.should.eql('GET');
          result.log.meta.req.query.should.eql({
            val: '1'
          });

          result.log.meta.req.should.not.have.property('nonWhitelistedProperty');
        });

        it('should not swallow the pipline error', function () {
          result.pipelineError.should.be.ok;
          result.pipelineError.should.eql(result.originalError);
        });
      });
    });
  });

  describe('.logger()', function () {
    it('should be a function', function () {
      expressWinston.logger.should.be.a.Function;
    });

    it('should throw an error without options', function () {
      (function () {
        expressWinston.logger();
      }).should.throwError();
    });

    it('should throw an error without any transport specified', function () {
      (function () {
        expressWinston.logger({});
      }).should.throwError();
    });

    it('should throw an error with an empty list of transports', function () {
      (function () {
        expressWinston.logger({
          transports: []
        });
      }).should.throwError();
    });

    it('should throw an error if ignoreRoute option is not a function', function () {
      (function () {
        expressWinston.logger({
          transports: [new MockTransport({})],
          ignoreRoute: 'not a function'
        });
      }).should.throwError();
    });

    it('should return a middleware function with three arguments that fit (req, res, next)', function () {
      var middleware = expressWinston.logger({
        transports: [new MockTransport({})]
      });

      middleware.length.should.eql(3);
    });

    describe('logger() middleware()', function () {
      describe('v0.1.x API', function () {
        describe('when invoked on a route', function () {
          var result;

          before(function (done) {
            setUp();

            var test = {
              req: req,
              res: res,
              log: {}
            };

            function next(_req, _res, next) {
              res.end('{ "message": "Hi!  I\'m a chunk!" }');
              result = test;
              return done();
            };

            var middleware = expressWinston.logger({
              transports: [new MockTransport(test)]
            });

            middleware(req, res, next);
          });

          it('should invoke the transport', function () {
            result.transportInvoked.should.eql(true);
          });

          it('should contain a filtered request', function () {
            result.log.meta.req.should.be.ok;
            result.log.meta.req.method.should.eql('GET');
            result.log.meta.req.query.should.eql({
              val: '1'
            });

            result.log.meta.req.should.not.have.property('nonWhitelistedProperty');
          });
        });

        describe('when invoked on a route that should be ignored', function () {
          var result;

          before(function (done) {
            setUp({
              ignoreRoute: true
            });

            var test = {
              req: req,
              res: res,
              log: {}
            };

            function next(_req, _res, next) {
              res.end('{ "message": "Hi!  I\'m a chunk!" }');
              result = test;
              return done();
            };

            var middleware = expressWinston.logger({
              transports: [new MockTransport(test)]
            });

            middleware(req, res, next);
          });

          it('should not invoke the transport', function () {
            result.transportInvoked.should.eql(false);
          });

          it('should contain a filtered request', function () {
            result.log.should.be.empty;
          });
        });
      });

      describe('v0.2.x API', function () {
        describe('when invoked on a route', function () {
          var result;

          before(function (done) {
            setUp({
              body: {
                username: "bobby",
                password: "top-secret",
                age: 42,
                potato: 'Russet'
              }
            });

            req.routeLevelAddedProperty = 'value that should be logged';

            res.nonWhitelistedProperty = 'value that should not be logged';
            res.routeLevelAddedProperty = 'value that should be logged';

            var test = {
              req: req,
              res: res,
              log: {}
            };

            function next(_req, _res, next) {
              req._startTime = (new Date) - 125;

              req._routeWhitelists.req = ['routeLevelAddedProperty'];
              req._routeWhitelists.res = ['routeLevelAddedProperty'];

              req._routeWhitelists.body = ['username'];
              req._routeBlacklists.body = ['age'];

              res.end('{ "message": "Hi!  I\'m a chunk!" }');

              result = test;

              return done();
            };

            var middleware = expressWinston.logger({
              transports: [new MockTransport(test)]
            });

            middleware(req, res, next);
          });

          it('should invoke the transport', function () {
            result.transportInvoked.should.eql(true);
          });

          it('should contain a filtered request', function () {
            result.log.meta.req.should.be.ok;
            result.log.meta.req.method.should.eql('GET');
            result.log.meta.req.query.should.eql({
              val: '1'
            });

            result.log.meta.req.body.should.not.have.property('age');
            result.log.meta.req.body.should.not.have.property('potato');
          });

          it('should contain a filtered response', function () {
            result.log.meta.res.should.be.ok;

            result.log.meta.res.statusCode.should.eql(200);
            result.log.meta.res.routeLevelAddedProperty.should.be.ok;

            result.log.meta.res.should.not.have.property('nonWhitelistedProperty');
          });

          it('should contain a response time', function () {
            result.log.meta.responseTime.should.be.within(120, 130);
          });
        });

        describe('when invoked on a route with an empty response body', function () {
          var result;

          before(function (done) {
            setUp({
              url: '/hello',
              body: {}
            });

            req.routeLevelAddedProperty = 'value that should be logged';

            var test = {
              req: req,
              res: res,
              log: {}
            };

            function next(_req, _res, next) {
              res.end();

              result = test;

              return done();
            };

            var middleware = expressWinston.logger({
              transports: [new MockTransport(test)]
            });

            middleware(req, res, next);
          });

          it('should not have an empty body in meta.req', function () {
            result.log.meta.res.should.not.have.property('body');
          });
        });

        describe('when invoked on a route with transport level of "error"', function () {
          var result;

          before(function (done) {
            setUp({
              url: "/hello",
              body: {}
            });

            req.routeLevelAddedProperty = 'value that should be logged';

            res.nonWhitelistedProperty = 'value that should not be logged';
            res.routeLevelAddedProperty = 'value that should be logged';

            var test = {
              req: req,
              res: res,
              log: {}
            };

            function next(_req, _res, next) {
              req._routeWhitelists.req = ['routeLevelAddedProperty'];
              req._routeWhitelists.res = ['routeLevelAddedProperty'];

              res.end('{ "message": "Hi!  I\'m a chunk!" }');
              result = test;
              return done();
            };

            var middleware = expressWinston.logger({
              transports: [new MockTransport(test, {
                level: 'error'
              })],
              statusLevels: true
            });

            middleware(req, res, next);
          });

          it('should not invoke the transport', function () {
            result.transportInvoked.should.eql(false);
          });
        });

        describe('when invoked on a route that should be ignored (options.ignoreRoute)', function () {
          var result;

          before(function (done) {
            setUp({
              url: '/is-not-logged'
            });
            req.skip = true;
            var test = {
              req: req,
              res: res,
              log: {}
            };

            function next(_req, _res, next) {
              res.end('{ "message": "Hi!  I\'m a chunk!" }');
              result = test;
              return done();
            };

            var middleware = expressWinston.logger({
              transports: [new MockTransport(test)],
              ignoreRoute: function (req, res) {
                return req.skip === true && req.url.match(/^\/is-not-log/);
              }
            });

            middleware(req, res, next);
          });

          it('should not invoke the transport', function () {
            result.transportInvoked.should.eql(false);
          });

          it('should contain a filtered request', function () {
            result.log.should.be.empty;
          });
        });
      });

      describe('log.msg', function () {
        var result;

        function logMsgSetup(url, msg, expressFormat, done) {
          setUp({
            url: url || '/an-url'
          });

          var test = {
            req: req,
            res: res,
            log: {}
          };

          function next(_req, _res, next) {
            res.end('{ "message": "Hi!  I\'m a chunk!" }');

            result = test;

            return done();
          };

          var loggerOptions = {
            transports: [new MockTransport(test)]
          };

          if (msg) {
            loggerOptions.msg = msg;
          }

          if (expressFormat) {
            delete loggerOptions.msg;
            loggerOptions.expressFormat = true;
          }

          var middleware = expressWinston.logger(loggerOptions);

          middleware(req, res, next);
        }

        describe('when default', function () {

          before(function (done) {
            logMsgSetup('/url-of-sandwich', null, false, done);
          });

          it('should match the custom format', function () {
            result.log.msg.should.eql('HTTP GET /url-of-sandwich');
          });
        });

        describe('using Express format', function () {
          before(function (done) {
            logMsgSetup('/all-the-things', null, true, done);
          });

          it('should match the Express format', function () {
            var resultMsg = result.log.msg;
            resultMsg.should.startWith('\u001b[90mGET /all-the-things\u001b[39m \u001b[32m200\u001b[39m \u001b[90m');
            resultMsg.should.endWith('ms\u001b[39m');
          });
        });

        describe('when customized', function () {
          before(function (done) {
            logMsgSetup('/all-the-things', 'Foo {{ req.method }} {{ req.url }}', false, done);
          });

          it('should match the custom format', function () {
            result.log.msg.should.eql('Foo GET /all-the-things');
          });
        });
      });
      
      describe('log.skip', function () {
        var result;

        function logSkipSetup(url, skip, done) {
          setUp({
            url: url || '/an-url'
          });

          var test = {
            req: req,
            res: res,
            log: {}
          };

          function next(_req, _res, next) {
            res.end('{ "message": "Hi!  I\'m a chunk!" }');

            result = test;

            return done();
          };

          var loggerOptions = {
            transports: [new MockTransport(test)]
          };

          if (skip) {
            loggerOptions.skip = skip;
          }

          var middleware = expressWinston.logger(loggerOptions);

          middleware(req, res, next);
        }

        describe('when default', function () {

          before(function (done) {
            logSkipSetup('/url-of-sandwich', null, done);
          });

          it('should be logged', function () {
            result.log.msg.should.eql('HTTP GET /url-of-sandwich');
          });
        });

        describe('when using custom function returning true', function () {
          before(function (done) {
            logSkipSetup('/url-of-sandwich', function(req, res) { return req.url.indexOf('sandwich') != -1 }, done);
          });

          it('should not be logged', function () {
            should.not.exist(result.log.msg);
          });
        });

        describe('when using custom function returning false', function () {
          before(function (done) {
            logSkipSetup('/hello', function(req, res) { return req.url.indexOf('sandwich') != -1 }, done);
          });

          it('should be logged', function () {
            result.log.msg.should.eql('HTTP GET /hello');
          });
        });
      });
    });
  });
});
