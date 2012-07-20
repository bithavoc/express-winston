// Copyright (c) 2012 Firebase.co and Contributors - http://www.firebase.co
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

var winston = require('winston');
var async = require('async');
var util = require('util');

// default list of properties in the request object that are allowed to be logged.
// these properties will be safely included in the meta of the log.
// 'body' is not included in this list because it can contains passwords and stuff that are sensitive for logging.
// TODO: Include 'body' and get the defaultRequestFilter to filter the inner properties like 'password' or 'password_confirmation', etc. Pull requests anyone?
var requestWhitelist = ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query'];

// default function to filter the properties of the req object.
var defaultRequestFilter = function(req, propName) {
  return req[propName];
};

function filterRequest(originalReq, initialFilter) {
  var req = {};
  Object.keys(originalReq).forEach(function(propName) {
    // if the property is not in the whitelist, we return undefined so is not logged as part of the meta.
    if(requestWhitelist.indexOf(propName) == -1) return;
    var value = initialFilter(originalReq, propName);
    if(typeof(value) !== 'undefined') {
      req[propName] = value;
    }
  });
  return req;
};

// 
// ### function errorLogger(options)
// #### @options {Object} options to initialize the middleware.
//
function errorLogger(options) {
  if(!options) throw new Error("options are required by express-winston middleware");
  if(!options.transports || !(options.transports.length > 0)) throw new Error("transports are required by express-winston middleware");
  options.requestFilter = options.requestFilter || defaultRequestFilter;
  return function(err, req, res, next) {
    // let winston gather all the error data.
    var exceptionMeta = winston.exception.getAllInfo(err);
    exceptionMeta.req = filterRequest(req, options.requestFilter);

    function logOnTransport(transport, nextTransport) {
      return transport.logException('middlewareError', exceptionMeta, nextTransport);
    };

    function done() {
      return next(err);
    };
    // iterate all the transports
    async.forEach(options.transports, logOnTransport, done);
  };
};

// 
// ### function logger(options)
// #### @options {Object} options to initialize the middleware.
//
function logger(options) {
  if(!options) throw new Error("options are required by express-winston middleware");
  if(!options.transports || !(options.transports.length > 0)) throw new Error("transports are required by express-winston middleware");
  options.requestFilter = options.requestFilter || defaultRequestFilter;
  return function(req, res, next) {
    var meta = {
      req: filterRequest(req, options.requestFilter)
    };
    var msg = util.format("HTTP %s %s", req.method, req.url);

    function logOnTransport(transport, nextTransport) {
      return transport.log('info', msg, meta, nextTransport);
    };

    function done() {
      return next();
    };
    // iterate all the transports
    async.forEach(options.transports, logOnTransport, done);
  };
};

module.exports.errorLogger = errorLogger;
module.exports.logger = logger;
module.exports.requestWhitelist = requestWhitelist;
module.exports.defaultRequestFilter = defaultRequestFilter;
