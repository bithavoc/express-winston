var vows = require('vows');
var assert = require('assert');
var winston = require('winston');
var expressWinston = require('../index');
var util = require('util');
var events = require('events');

var MockTransport = function(options) {
  winston.Transport.call(this, options);
  this.log = function () {};
};
util.inherits(MockTransport, winston.Transport);

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
          factory({transports:[]});
        }, Error);
      }
    },
    "with proper options": {
      "the result should be a function with four arguments that fit err, req, res, next": function (factory) {
        var middleware = factory({
          transports: [
            new MockTransport({

            })
          ]
        });
        assert.equal(middleware.length, 4);
      }
    }
  },
  "When the express-winston middleware encounter an error in the pipeline": {
    topic: function() {
      var factory = expressWinston.errorLogger;
      var callback = this.callback;
      var req = {
        url: "/hello?val=1",
        headers: {
          'header-1': 'value 1'
        },
        method: 'GET',
        query: {
          val: '1'
        },
        originalUrl: "/hello?val=1",
        params: {
          id: 20
        },
        nonWhitelistedProperty: "value that should not be logged"
      };
      var res = {

      };
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

      var transport = new MockTransport({});
      transport.log = function(level, msg, meta, cb) {
        test.transportInvoked = true;
        test.log.level = level;
        test.log.msg = msg;
        test.log.meta = meta;
        this.emit('logged');
        return cb();
      };
      var middleware = factory({
        transports: [transport]
      });
      middleware(originalError, req, res, next);
    }
    , "then the transport should be invoked": function(result){
      assert.isTrue(result.transportInvoked);
    }
    , "the error level should be error": function(result){
      assert.equal(result.log.level, "error");
    }
    , "the msg should be middlewareError": function(result){
      assert.equal(result.log.msg, "middlewareError");
    }
    , "the meta should contain a filtered request": function(result){
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
          factory({transports:[]});
        }, Error);
      }
    },
    "with proper options": {
      "the result should be a function with three arguments that fit req, res, next": function (factory) {
        var middleware = factory({
          transports: [
            new MockTransport({

            })
          ]
        });
        assert.equal(middleware.length, 3);
      }
    }
  },
  "When the express-winston middleware is invoked in pipeline": {
    topic: function() {
      var factory = expressWinston.logger;
      var callback = this.callback;
      var req = {
        url: "/hello?val=1",
        headers: {
          'header-1': 'value 1'
        },
        method: 'GET',
        query: {
          val: '2'
        },
        originalUrl: "/hello?val=2",
        params: {
          id: 20
        },
        filteredProperty: "value that should not be logged"
      };
      var res = {
        end: function(chunk, encoding) {}
      };
      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        res.end();
        return callback(null, test);
      };

      var transport = new MockTransport({});
      transport.log = function(level, msg, meta, cb) {
        test.transportInvoked = true;
        test.log.level = level;
        test.log.msg = msg;
        test.log.meta = meta;
        this.emit('logged');
        return cb();
      };
      var middleware = factory({
        transports: [transport]
      });
      middleware(req, res, next);
    }
    , "then the transport should be invoked": function(result){
      assert.isTrue(result.transportInvoked);
    }
    , "the meta should contain a filtered request": function(result){
      assert.isTrue(!!result.log.meta.req, "req should be defined in meta");
      assert.isNotNull(result.log.meta.req);
      assert.equal(result.log.meta.req.method, "GET");
      assert.deepEqual(result.log.meta.req.query, {
                      val: '2'
      });
      assert.isUndefined(result.log.meta.req.filteredProperty);
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
          factory({transports:[]});
        }, Error);
      }
    },
    "with proper options": {
      "the result should be a function with three arguments that fit req, res, next": function (factory) {
        var middleware = factory({
          transports: [
            new MockTransport({

            })
          ]
        });
        assert.equal(middleware.length, 3);
      }
    }
  },
  "When the express-winston middleware is invoked in pipeline": {
    topic: function () {
      var factory = expressWinston.logger;
      var callback = this.callback;
      var req = {
        url: "/hello?val=1",
        headers: {
          'header-1': 'value 1'
        },
        method: 'GET',
        query: {
          val: '2'
        },
        originalUrl: "/hello?val=2",
        params: {
          id: 20
        },
        nonWhitelistedProperty: "value that should not be logged",
        routeLevelAddedProperty: "value that should be logged",
        body: {
          username: 'bobby',
          password: 'top-secret'
        }
      };
      var res = {
        statusCode: 200,
        nonWhitelistedProperty: "value that should not be logged",
        routeLevelAddedProperty: "value that should be logged",
        end: function(chunk, encoding) {

        }
      };
      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        req._startTime = (new Date) - 125;

        req._routeWhitelists.req = [ 'routeLevelAddedProperty' ];
        req._routeWhitelists.body = [ 'username' ];

        res.end();
        return callback(null, test);
      };

      var transport = new MockTransport({});
      transport.log = function(level, msg, meta, cb) {
        test.transportInvoked = true;
        test.log.level = level;
        test.log.msg = msg;
        test.log.meta = meta;
        this.emit('logged');
        return cb();
      };
      var middleware = factory({
        transports: [transport],
        statusLevels: true
      });
      middleware(req, res, next);
    }
    , "then the transport should be invoked": function(result){
      assert.isTrue(result.transportInvoked);
    }
    , "the meta should contain a filtered request": function(result){
      assert.isTrue(!!result.log.meta.req, "req should be defined in meta");
      assert.isNotNull(result.log.meta.req);
      assert.equal(result.log.meta.req.method, "GET");
      assert.deepEqual(result.log.meta.req.query, { val: '2' });
      assert.isUndefined(result.log.meta.req.nonWhitelistedProperty);

      assert.isNotNull(result.log.meta.req.routeLevelAddedProperty);
    }
    , "the meta should contain a filtered request body": function(result) {
      assert.deepEqual(result.log.meta.req.body, {username: 'bobby'});
      assert.isUndefined(result.log.meta.req.body.password);
    }
    , "the meta should contain a filtered response": function(result){
      assert.isTrue(!!result.log.meta.res, "res should be defined in meta");
      assert.isNotNull(result.log.meta.res);
      assert.equal(result.log.meta.res.statusCode, 200);
      assert.isNotNull(result.log.meta.res.routeLevelAddedProperty);
    }
    , "the meta should contain a response time": function(result){
      assert.isTrue(!!result.log.meta.responseTime, "responseTime should be defined in meta");
      assert.isNotNull(result.log.meta.responseTime);
      assert.isTrue(result.log.meta.responseTime > 120);
      assert.isTrue(result.log.meta.responseTime < 130);
    }
    , "the log level should be info": function (result) {
      assert.equal(result.log.level, "info");
    }
  },
  "When the express-winston middleware is invoked in pipeline": {
    topic: function () {
      var factory = expressWinston.logger;
      var callback = this.callback;
      var req = {
        url: "/hello",
        body: {
        }
      };
      var res = {
        statusCode: 200,
        end: function(chunk, encoding) {
        }
      };
      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        res.end();
        return callback(null, test);
      };

      var transport = new MockTransport({});
      transport.log = function(level, msg, meta, cb) {
        test.transportInvoked = true;
        test.log.level = level;
        test.log.msg = msg;
        test.log.meta = meta;
        this.emit('logged');
        return cb();
      };
      var middleware = factory({
        transports: [transport],
        statusLevels: true
      });
      middleware(req, res, next);
    }
    , "the empty body should not be present in req meta": function (result) {
      assert.equal(typeof result.log.meta.req.body, "undefined");
    }
  },
  "When the express-winston middleware is invoked in pipeline and transport level is 'error'": {
    topic: function () {
      var factory = expressWinston.logger;
      var callback = this.callback;
      var req = {
        url: "/hello",
        body: {
        }
      };
      var res = {
        statusCode: 200,
        end: function(chunk, encoding) {
        }
      };
      var test = {
        req: req,
        res: res,
        log: {}
      };
      var next = function(_req, _res, next) {
        res.end();
        return callback(null, test);
      };

      test.transportInvoked = false;

      var transport = new MockTransport({ level: 'error' });
      transport.log = function(level, msg, meta, cb) {
        test.transportInvoked = true;
      };
      var middleware = factory({
        transports: [transport],
        statusLevels: true
      });
      middleware(req, res, next);
    }
    , "then the transport should not be invoked": function(result) {
      assert.isFalse(result.transportInvoked);
    }
  }
}).export(module);

