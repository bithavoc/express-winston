var vows = require('vows');
var assert = require('assert');
var winston = require('winston');
var expressWinston = require('../index');
var util = require('util');
var events = require('events');
var mocks = require('node-mocks-http');

expressWinston.ignoredRoutes.push('/ignored');

var MockTransport = function(test, options) {
  test.transportInvoked = false;

  winston.Transport.call(this, options || {});

  this.log = function(level, msg, meta, cb) {
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

var setUp = function(options) {
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

  if (options.ignoreRoute) reqSpec.url = "/ignored";
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

vows.describe("exports").addBatch({
  "When I check the exported properties": {
    topic: function() {
      return expressWinston;
    },
    "an array with all the properties whitelisted in the req object": function(exports) {
      assert.isArray(exports.requestWhitelist);
    },
    "an array with all the properties whitelisted in the res object": function(exports) {
      assert.isArray(exports.responseWhitelist);
    },
    "an array for all the ignored routes": function(exports) {
      assert.isArray(exports.ignoredRoutes);
    },
    "an array with all the properties whitelisted in the body object": function(exports) {
      assert.isArray(exports.bodyWhitelist);
    },
    "and the factory should contain a default request filter function": function(exports) {
      assert.isFunction(exports.defaultRequestFilter);
    },
    "and the factory should contain a default response filter function": function(exports) {
      assert.isFunction(exports.defaultResponseFilter);
    },
    "it should export a function for the creation of error loggers middlewares": function(exports) {
      assert.isFunction(exports.errorLogger);
    },
    "it should export a function for the creation of request logger middlewares": function(exports) {
      assert.isFunction(exports.logger);
    }
  }
}).export(module);

vows.describe("errorLogger").addBatch({
  "when I run the middleware factory": {
    topic: function() {
      return expressWinston.errorLogger;
    },
    "without options": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory();
        }, Error);
      }
    },
    "without any transport specified": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory({});
        }, Error);
      }
    },
    "with an empty list of transports": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory({
            transports: []
          });
        }, Error);
      }
    },
    "with proper options": {
      "the result should be a function with four arguments that fit err, req, res, next": function(factory) {
        var middleware = factory({
          transports: [new MockTransport({})]
        });
        assert.equal(middleware.length, 4);
      }
    }
  },
  "When the express-winston middleware encounter an error in the pipeline": {
    topic: function() {
      setUp();
      var factory = expressWinston.errorLogger;
      var callback = this.callback;

      var originalError = new Error("This is the Error");
      var test = {
        req: req,
        res: res,
        log: {},
        originalError: originalError,
        pipelineError: null
      };
      var next = function(pipelineError) {
        test.pipelineError = pipelineError;
        return callback(null, test);
      };

      var middleware = factory({
        transports: [new MockTransport(test)]
      });
      middleware(originalError, req, res, next);
    },
    "then the transport should be invoked": function(result) {
      assert.isTrue(result.transportInvoked);
    },
    "the error level should be error": function(result) {
      assert.equal(result.log.level, "error");
    },
    "the msg should be middlewareError": function(result) {
      assert.equal(result.log.msg, "middlewareError");
    },
    "the meta should contain a filtered request": function(result) {
      assert.isTrue(!!result.log.meta.req, "req should be defined in meta");
      assert.isNotNull(result.log.meta.req);
      assert.equal(result.log.meta.req.method, "GET");
      assert.deepEqual(result.log.meta.req.query, {
        val: '1'
      });
      assert.isUndefined(result.log.meta.req.nonWhitelistedProperty);
    },
    "the express-winston middleware should not swallow the pipeline error": function(result) {
      assert.isNotNull(result.pipelineError);
      assert.strictEqual(result.pipelineError, result.originalError);
    }
  }
}).export(module);

vows.describe("logger 0.1.x").addBatch({
  "when I run the middleware factory": {
    topic: function() {
      return expressWinston.logger;
    },
    "without options": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory();
        }, Error);
      }
    },
    "without any transport specified": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory({});
        }, Error);
      }
    },
    "with an empty list of transports": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory({
            transports: []
          });
        }, Error);
      }
    },
    "with proper options": {
      "the result should be a function with three arguments that fit req, res, next": function(factory) {
        var middleware = factory({
          transports: [new MockTransport({})]
        });
        assert.equal(middleware.length, 3);
      }
    }
  },
  "When the express-winston middleware is invoked in pipeline": {
    topic: function() {
      setUp();
      var factory = expressWinston.logger;
      var callback = this.callback;

      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        res.end();
        return callback(null, test);
      };

      var middleware = factory({
        transports: [new MockTransport(test)]
      });
      middleware(req, res, next);
    },
    "then the transport should be invoked": function(result) {
      assert.isTrue(result.transportInvoked);
    },
    "the meta should contain a filtered request": function(result) {
      assert.isTrue(!!result.log.meta.req, "req should be defined in meta");
      assert.isNotNull(result.log.meta.req);
      assert.equal(result.log.meta.req.method, "GET");
      assert.deepEqual(result.log.meta.req.query, {
        val: '1'
      });
      assert.isUndefined(result.log.meta.req.filteredProperty);
    }
  },
  "When the express-winston middleware is invoked in pipeline on a route that should be ignored": {
    topic: function() {
      setUp({
        ignoreRoute: true
      });
      var factory = expressWinston.logger;
      var callback = this.callback;

      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        res.end();
        return callback(null, test);
      };

      var middleware = factory({
        transports: [new MockTransport(test)]
      });
      middleware(req, res, next);
    },
    "then the transport should not be invoked": function(result) {
      assert.isFalse(result.transportInvoked);
    },
    "the meta should not be defined": function(result) {
      assert.isUndefined(result.log.meta);
    }
  }
}).export(module);

vows.describe("logger 0.2.x").addBatch({
  "when I run the middleware factory": {
    topic: function() {
      return expressWinston.logger;
    },
    "without options": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory();
        }, Error);
      }
    },
    "without any transport specified": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory({});
        }, Error);
      }
    },
    "with an empty list of transports": {
      "an error should be raised": function(factory) {
        assert.throws(function() {
          factory({
            transports: []
          });
        }, Error);
      }
    },
    "with proper options": {
      "the result should be a function with three arguments that fit req, res, next": function(factory) {
        var middleware = factory({
          transports: [new MockTransport({})]
        });
        assert.equal(middleware.length, 3);
      }
    }
  },
  "When the express-winston middleware is invoked in pipeline": {
    topic: function() {
      setUp({
        body: {
          username: "bobby",
          password: "top-secret"
        }
      });

      var factory = expressWinston.logger;
      var callback = this.callback;

      req.routeLevelAddedProperty = "value that should be logged";

      res.nonWhitelistedProperty = "value that should not be logged";
      res.routeLevelAddedProperty = "value that should be logged";

      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        req._startTime = (new Date) - 125;

        req._routeWhitelists.req = ['routeLevelAddedProperty'];
        req._routeWhitelists.body = ['username'];

        res.end();
        return callback(null, test);
      };

      var middleware = factory({
        transports: [new MockTransport(test)],
        statusLevels: true
      });
      middleware(req, res, next);
    },
    "then the transport should be invoked": function(result) {
      assert.isTrue(result.transportInvoked);
    },
    "the meta should contain a filtered request": function(result) {
      assert.isTrue(!!result.log.meta.req, "req should be defined in meta");
      assert.isNotNull(result.log.meta.req);
      assert.equal(result.log.meta.req.method, "GET");
      assert.deepEqual(result.log.meta.req.query, {
        val: '1'
      });
      assert.isUndefined(result.log.meta.req.nonWhitelistedProperty);

      assert.isNotNull(result.log.meta.req.routeLevelAddedProperty);
    },
    "the meta should contain a filtered request body": function(result) {
      assert.deepEqual(result.log.meta.req.body, {
        username: 'bobby'
      });
      assert.isUndefined(result.log.meta.req.body.password);
    },
    "the meta should contain a filtered response": function(result) {
      assert.isTrue(!!result.log.meta.res, "res should be defined in meta");
      assert.isNotNull(result.log.meta.res);
      assert.equal(result.log.meta.res.statusCode, 200);
      assert.isNotNull(result.log.meta.res.routeLevelAddedProperty);
    },
    "the meta should contain a response time": function(result) {
      assert.isTrue(!!result.log.meta.responseTime, "responseTime should be defined in meta");
      assert.isNotNull(result.log.meta.responseTime);
      assert.isTrue(result.log.meta.responseTime > 120);
      assert.isTrue(result.log.meta.responseTime < 130);
    },
    "the log level should be info": function(result) {
      assert.equal(result.log.level, "info");
    }
  },
  "When the express-winston middleware is invoked in pipeline with an empty response body": {
    topic: function() {
      setUp({
        url: '/hello',
        body: {}
      });

      var factory = expressWinston.logger;
      var callback = this.callback;

      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        res.end();
        return callback(null, test);
      };

      var middleware = factory({
        transports: [new MockTransport(test)],
        statusLevels: true
      });
      middleware(req, res, next);
    },
    "the empty body should not be present in req meta": function(result) {
      assert.equal(typeof result.log.meta.req.body, "undefined");
    }
  },
  "When the express-winston middleware is invoked in pipeline and transport level is 'error'": {
    topic: function() {
      setUp({
        url: "/hello",
        body: {}
      });

      var factory = expressWinston.logger;
      var callback = this.callback;

      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        res.end();
        return callback(null, test);
      };

      var middleware = factory({
        transports: [new MockTransport(test, {
          level: 'error'
        })],
        statusLevels: true
      });
      middleware(req, res, next);
    },
    "then the transport should not be invoked": function(result) {
      assert.isFalse(result.transportInvoked);
    }
  }
}).export(module);