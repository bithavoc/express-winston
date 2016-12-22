// Copyright (c) 2012-2014 Heapsource.com and Contributors - http://www.heapsource.com
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
var util = require('util');
var chalk = require('chalk');

var _ = require('lodash');

/**
 * A default list of properties in the request object that are allowed to be logged.
 * These properties will be safely included in the meta of the log.
 * 'body' is not included in this list because it can contains passwords and stuff that are sensitive for logging.
 * TODO: Include 'body' and get the defaultRequestFilter to filter the inner properties like 'password' or 'password_confirmation', etc. Pull requests anyone?
 * @type {Array}
 */
exports.requestWhitelist = ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query'];

/**
 * A default list of properties in the request body that are allowed to be logged.
 * This will normally be empty here, since it should be done at the route level.
 * @type {Array}
 */
exports.bodyWhitelist = [];

/**
 * A default list of properties in the request body that are not allowed to be logged.
 * @type {Array}
 */
exports.bodyBlacklist = [];

/**
 * A default list of properties in the response object that are allowed to be logged.
 * These properties will be safely included in the meta of the log.
 * @type {Array}
 */
exports.responseWhitelist = ['statusCode'];

/**
 * A list of request routes that will be skipped instead of being logged. This would be useful if routes for health checks or pings would otherwise pollute
 * your log files.
 * @type {Array}
 */
exports.ignoredRoutes = [];

/**
 * A default function to filter the properties of the req object.
 * @param req
 * @param propName
 * @return {*}
 */
exports.defaultRequestFilter = function (req, propName) {
    return req[propName];
};

/**
 * A default function to filter the properties of the res object.
 * @param res
 * @param propName
 * @return {*}
 */
exports.defaultResponseFilter = function (res, propName) {
    return res[propName];
};

/**
 * A default function to decide whether skip logging of particular request. Doesn't skip anything (i.e. log all requests).
 * @return always false
 */
exports.defaultSkip = function() {
  return false;
};

function filterObject(originalObj, whiteList, initialFilter) {

    var obj = {};
    var fieldsSet = false;

    [].concat(whiteList).forEach(function (propName) {
        var value = initialFilter(originalObj, propName);

        if(typeof (value) !== 'undefined') {
            obj[propName] = value;
            fieldsSet = true;
        };
    });

    return fieldsSet?obj:undefined;
}

//
// ### function errorLogger(options)
// #### @options {Object} options to initialize the middleware.
//


exports.errorLogger = function errorLogger(options) {

    ensureValidOptions(options);

    options.requestWhitelist = options.requestWhitelist || exports.requestWhitelist;
    options.requestFilter = options.requestFilter || exports.defaultRequestFilter;
    options.winstonInstance = options.winstonInstance || (new winston.Logger ({ transports: options.transports }));
    options.msg = options.msg || 'middlewareError';
    options.baseMeta = options.baseMeta || {};
    options.metaField = options.metaField || null;
    options.level = options.level || 'error';

    // Using mustache style templating
    var template = _.template(options.msg, {
      interpolate: /\{\{(.+?)\}\}/g
    });

    return function (err, req, res, next) {

        // Let winston gather all the error data.
        var exceptionMeta = winston.exception.getAllInfo(err);
        exceptionMeta.req = filterObject(req, options.requestWhitelist, options.requestFilter);

        if (options.metaField) {
            var newMeta = {};
            newMeta[options.metaField] = exceptionMeta;
            exceptionMeta = newMeta;
        }

        exceptionMeta = _.assign(exceptionMeta, options.baseMeta);

        // This is fire and forget, we don't want logging to hold up the request so don't wait for the callback
        options.winstonInstance.log(options.level, template({err: err, req: req, res: res}), exceptionMeta);

        next(err);
    };
};

//
// ### function logger(options)
// #### @options {Object} options to initialize the middleware.
//


exports.logger = function logger(options) {

    ensureValidOptions(options);
    ensureValidLoggerOptions(options);

    options.requestWhitelist = options.requestWhitelist || exports.requestWhitelist;
    options.bodyWhitelist = options.bodyWhitelist || exports.bodyWhitelist;
    options.bodyBlacklist = options.bodyBlacklist || exports.bodyBlacklist;
    options.responseWhitelist = options.responseWhitelist || exports.responseWhitelist;
    options.requestFilter = options.requestFilter || exports.defaultRequestFilter;
    options.responseFilter = options.responseFilter || exports.defaultResponseFilter;
    options.ignoredRoutes = options.ignoredRoutes || exports.ignoredRoutes;
    options.winstonInstance = options.winstonInstance || (new winston.Logger ({ transports: options.transports }));
    options.level = options.level || "info";
    options.statusLevels = options.statusLevels || false;
    options.msg = options.msg || "HTTP {{req.method}} {{req.url}}";
    options.baseMeta = options.baseMeta || {};
    options.metaField = options.metaField || null;
    options.colorize = options.colorize || false;
    options.expressFormat = options.expressFormat || false;
    options.ignoreRoute = options.ignoreRoute || function () { return false; };
    options.skip = options.skip || exports.defaultSkip;
    options.dynamicMeta = options.dynamicMeta || function(req, res) { return null; };

    return function (req, res, next) {
        var coloredRes = {};

        var currentUrl = req.originalUrl || req.url;
        if (currentUrl && _.includes(options.ignoredRoutes, currentUrl)) return next();
        if (options.ignoreRoute(req, res)) return next();

        req._startTime = (new Date);

        req._routeWhitelists = {
            req: [],
            res: [],
            body: []
        };

        req._routeBlacklists = {
            body: []
        };

        // Manage to get information from the response too, just like Connect.logger does:
        var end = res.end;
        res.end = function(chunk, encoding) {
            res.responseTime = (new Date) - req._startTime;

            res.end = end;
            res.end(chunk, encoding);

            req.url = req.originalUrl || req.url;

            if (options.statusLevels) {
              if (res.statusCode >= 100) { options.level = options.statusLevels.success || "info"; }
              if (res.statusCode >= 400) { options.level = options.statusLevels.warn || "warn"; }
              if (res.statusCode >= 500) { options.level = options.statusLevels.error || "error"; }
            };

            var meta = {};

            if(options.meta !== false) {
              var logData = {};

              var requestWhitelist = options.requestWhitelist.concat(req._routeWhitelists.req || []);
              var responseWhitelist = options.responseWhitelist.concat(req._routeWhitelists.res || []);

              logData.res = res;

              if (_.includes(responseWhitelist, 'body')) {
                if (chunk) {
                  var isJson = (res._headers && res._headers['content-type']
                    && res._headers['content-type'].indexOf('json') >= 0);

                  logData.res.body = bodyToString(chunk, isJson);
                }
              }

              logData.req = filterObject(req, requestWhitelist, options.requestFilter);
              logData.res = filterObject(res, responseWhitelist, options.responseFilter);

              var bodyWhitelist = _.union(options.bodyWhitelist, (req._routeWhitelists.body || []));
              var blacklist = _.union(options.bodyBlacklist, (req._routeBlacklists.body || []));

              var filteredBody = null;

              if ( req.body !== undefined ) {
                  if (blacklist.length > 0 && bodyWhitelist.length === 0) {
                    var whitelist = _.difference(Object.keys(req.body), blacklist);
                    filteredBody = filterObject(req.body, whitelist, options.requestFilter);
                  } else {
                    filteredBody = filterObject(req.body, bodyWhitelist, options.requestFilter);
                  }
              }

              if (logData.req) {
                if (filteredBody) {
                  logData.req.body = filteredBody;
                } else {
                  delete logData.req.body;
                }
              }

              logData.responseTime = res.responseTime;

              if(options.dynamicMeta) {
                  var dynamicMeta = options.dynamicMeta(req, res);
                  logData = _.assign(logData, dynamicMeta);
              }

              if (options.metaField) {
                  var newMeta = {};
                  newMeta[options.metaField] = logData;
                  logData = newMeta;
              }
              meta = _.assign(meta, logData);
            }

            meta = _.assign(meta, options.baseMeta);

            var expressMsgFormat = "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms";
            if (options.colorize) {
              // Palette from https://github.com/expressjs/morgan/blob/master/index.js#L205
              var statusColor = 'green';
              if (res.statusCode >= 500) statusColor = 'red';
              else if (res.statusCode >= 400) statusColor = 'yellow';
              else if (res.statusCode >= 300) statusColor = 'cyan';

              expressMsgFormat = chalk.grey("{{req.method}} {{req.url}}") +
                " {{res.statusCode}} " +
                chalk.grey("{{res.responseTime}}ms");
              coloredRes.statusCode = chalk[statusColor](res.statusCode);
            }
            var msgFormat = !options.expressFormat ? options.msg : expressMsgFormat;

            // Using mustache style templating
            var template = _.template(msgFormat, {
              interpolate: /\{\{(.+?)\}\}/g
            });

            var msg = template({req: req, res: _.assign({}, res, coloredRes)});

            // This is fire and forget, we don't want logging to hold up the request so don't wait for the callback
            if (!options.skip(req, res)) {
              options.winstonInstance.log(options.level, msg, meta);
            }
        };

        next();
    };
};

function safeJSONParse(string) {
    try {
        return JSON.parse(string);
    } catch (e) {
        return undefined;
    }
}

function bodyToString(body, isJSON) {
    var stringBody = body && body.toString();
    if (isJSON) {
        return (safeJSONParse(body) || stringBody);
    }
    return stringBody;
}

function ensureValidOptions(options) {
    if(!options) throw new Error("options are required by express-winston middleware");
    if(!((options.transports && (options.transports.length > 0)) || options.winstonInstance))
        throw new Error("transports or a winstonInstance are required by express-winston middleware");
}

function ensureValidLoggerOptions(options) {
    if (options.ignoreRoute && !_.isFunction(options.ignoreRoute)) {
        throw new Error("`ignoreRoute` express-winston option should be a function");
    }

    if (options.dynamicMeta && !_.isFunction(options.dynamicMeta)) {
        throw new Error("`dynamicMeta` express-winston option should be a function");
    }
}
