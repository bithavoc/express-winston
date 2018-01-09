# express-winston
[![Monthly Downloads](https://img.shields.io/npm/dm/express-winston.svg)](https://www.npmjs.com/package/express-winston) [![Build Status](https://secure.travis-ci.org/bithavoc/express-winston.png)](http://travis-ci.org/bithavoc/express-winston)

> [winston](https://github.com/winstonjs/winston) middleware for express.js

## Installation

    npm install winston express-winston

(supports node >= 0.10)

## Usage

express-winston provides middlewares for request and error logging of your express.js application.  It uses 'whitelists' to select properties from the request and (new in 0.2.x) response objects.

To make use of express-winston, you need to add the following to your application:

In `package.json`:

```
{
  "dependencies": {
    "...": "...",
    "winston": "^2.0.0",
    "express-winston": "^2.0.0",
    "...": "..."
  }
}
```

In `server.js` (or wherever you need it):

```
var winston = require('winston'),
    expressWinston = require('express-winston');
```

### Request Logging

Use `expressWinston.logger(options)` to create a middleware to log your HTTP requests.

``` js
    var router = require('./my-express-router');

    app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ],
      meta: true, // optional: control whether you want to log the meta data about the request (default to true)
      msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
      expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
      colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
      ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
    }));

    app.use(router); // notice how the router goes after the logger.
```

#### Options

``` js
    transports: [<WinstonTransport>], // list of all winston transports instances to use.
    winstonInstance: <WinstonLogger>, // a winston logger instance. If this is provided the transports option is ignored.
    level: String or function(req, res) { return String; }, // log level to use, the default is "info". Assign a  function to dynamically set the level based on request and response, or a string to statically set it always at that level. statusLevels must be false for this setting to be used.
    msg: String // customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}", "HTTP {{req.method}} {{req.url}}".
    expressFormat: Boolean, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors when colorize set to true
    colorize: Boolean, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
    meta: Boolean, // control whether you want to log the meta data about the request (default to true).
    baseMeta: Object, // default meta data to be added to log, this will be merged with the meta data.
    metaField: String, // if defined, the meta data will be added in this field instead of the meta root object.
    statusLevels: Boolean or Object // different HTTP status codes caused log messages to be logged at different levels (info/warn/error), the default is false. Use an object to control the levels various status codes are logged at. Using an object for statusLevels overrides any setting of options.level.
    ignoreRoute: function (req, res) { return false; } // A function to determine if logging is skipped, defaults to returning false. Called _before_ any later middleware.
    skip: function(req, res) { return false; } // A function to determine if logging is skipped, defaults to returning false. Called _after_ response has already been sent.
    requestFilter: function (req, propName) { return req[propName]; } // A function to filter/return request values, defaults to returning all values allowed by whitelist. If the function returns undefined, the key/value will not be included in the meta.
    responseFilter: function (res, propName) { return res[propName]; } // A function to filter/return response values, defaults to returning all values allowed by whitelist. If the function returns undefined, the key/value will not be included in the meta.
    requestWhitelist: [String] // Array of request properties to log. Overrides global requestWhitelist for this instance
    responseWhitelist: [String] // Array of response properties to log. Overrides global responseWhitelist for this instance
    bodyWhitelist: [String] // Array of body properties to log. Overrides global bodyWhitelist for this instance
    bodyBlacklist: [String] // Array of body properties to omit from logs. Overrides global bodyBlacklist for this instance
    ignoredRoutes: [String] // Array of paths to ignore/skip logging. Overrides global ignoredRoutes for this instance
    dynamicMeta: function(req, res) { return [Object]; } // Extract additional meta data from request or response (typically req.user data if using passport). meta must be true for this function to be activated

```

### Error Logging

Use `expressWinston.errorLogger(options)` to create a middleware that log the errors of the pipeline.

``` js
    var router = require('./my-express-router');

    app.use(router); // notice how the router goes first.
    app.use(expressWinston.errorLogger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ]
    }));
```

The logger needs to be added AFTER the express router(`app.router)`) and BEFORE any of your custom error handlers(`express.handler`). Since express-winston will just log the errors and not __handle__ them, you can still use your custom error handler like `express.handler`, just be sure to put the logger before any of your handlers.

#### Options

``` js
    transports: [<WinstonTransport>], // list of all winston transports instances to use.
    winstonInstance: <WinstonLogger>, // a winston logger instance. If this is provided the transports option is ignored
    msg: String // customize the default logging message. E.g. "{{err.message}} {{res.statusCode}} {{req.method}}".
    baseMeta: Object, // default meta data to be added to log, this will be merged with the error data.
    metaField: String, // if defined, the meta data will be added in this field instead of the meta root object.
    requestFilter: function (req, propName) { return req[propName]; } // A function to filter/return request values, defaults to returning all values allowed by whitelist. If the function returns undefined, the key/value will not be included in the meta.
    requestWhitelist: [String] // Array of request properties to log. Overrides global requestWhitelist for this instance
    level: String or function(req, res, err) { return String; }// custom log level for errors (default is 'error'). Assign a function to dynamically set the log level based on request, response, and the exact error.
    dynamicMeta: function(req, res, err) { return [Object]; } // Extract additional meta data from request or response (typically req.user data if using passport). meta must be true for this function to be activated
```

To use winston's existing transports, set `transports` to the values (as in key-value) of the `winston.default.transports` object. This may be done, for example, by using underscorejs: `transports: _.values(winston.default.transports)`.

Alternatively, if you're using a winston logger instance elsewhere and have already set up levels and transports, pass the instance into expressWinston with the `winstonInstance` option. The `transports` option is then ignored.

## Examples

``` js
    var express = require('express');
    var expressWinston = require('express-winston');
    var winston = require('winston'); // for transports.Console
    var app = module.exports = express();

    app.use(express.bodyParser());
    app.use(express.methodOverride());

    // Let's make our express `Router` first.
    var router = express.Router();
    router.get('/error', function(req, res, next) {
      // here we cause an error in the pipeline so we see express-winston in action.
      return next(new Error("This is an error and it should be logged to the console"));
    });

    app.get('/', function(req, res, next) {
      res.write('This is a normal request, it should be logged to the console too');
      res.end();
    });

    // express-winston logger makes sense BEFORE the router.
    app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ]
    }));

    // Now we can tell the app to use our routing code:
    app.use(router);

    // express-winston errorLogger makes sense AFTER the router.
    app.use(expressWinston.errorLogger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ]
    }));

    // Optionally you can include your custom error handler after the logging.
    app.use(express.errorLogger({
      dumpExceptions: true,
      showStack: true
    }));

    app.listen(3000, function(){
      console.log("express-winston demo listening on port %d in %s mode", this.address().port, app.settings.env);
    });
```

Browse `/` to see a regular HTTP logging like this:

    {
      "req": {
        "httpVersion": "1.1",
        "headers": {
          "host": "localhost:3000",
          "connection": "keep-alive",
          "accept": "*/*",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11",
          "accept-encoding": "gzip,deflate,sdch",
          "accept-language": "en-US,en;q=0.8,es-419;q=0.6,es;q=0.4",
          "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
          "cookie": "connect.sid=nGspCCSzH1qxwNTWYAoexI23.seE%2B6Whmcwd"
        },
        "url": "/",
        "method": "GET",
        "originalUrl": "/",
        "query": {}
      },
      "res": {
        "statusCode": 200
      },
      "responseTime" : 12,
      "level": "info",
      "message": "HTTP GET /favicon.ico"
    }

Browse `/error` will show you how express-winston handles and logs the errors in the express pipeline like this:

    {
      "date": "Thu Jul 19 2012 23:39:44 GMT-0500 (COT)",
      "process": {
        "pid": 35719,
        "uid": 501,
        "gid": 20,
        "cwd": "/Users/thepumpkin/Projects/testExpressWinston",
        "execPath": "/usr/local/bin/node",
        "version": "v0.6.18",
        "argv": [
          "node",
          "/Users/thepumpkin/Projects/testExpressWinston/app.js"
        ],
        "memoryUsage": {
          "rss": 14749696,
          "heapTotal": 7033664,
          "heapUsed": 5213280
        }
      },
      "os": {
        "loadavg": [
          1.95068359375,
          1.5166015625,
          1.38671875
        ],
        "uptime": 498086
      },
      "trace": [
        ...,
        {
          "column": 3,
          "file": "Object].log (/Users/thepumpkin/Projects/testExpressWinston/node_modules/winston/lib/winston/transports/console.js",
          "function": "[object",
          "line": 87,
          "method": null,
          "native": false
        }
      ],
      "stack": [
        "Error: This is an error and it should be logged to the console",
        "    at /Users/thepumpkin/Projects/testExpressWinston/app.js:39:15",
        "    at callbacks (/Users/thepumpkin/Projects/testExpressWinston/node_modules/express/lib/router/index.js:272:11)",
        "    at param (/Users/thepumpkin/Projects/testExpressWinston/node_modules/express/lib/router/index.js:246:11)",
        "    at pass (/Users/thepumpkin/Projects/testExpressWinston/node_modules/express/lib/router/index.js:253:5)",
        "    at Router._dispatch (/Users/thepumpkin/Projects/testExpressWinston/node_modules/express/lib/router/index.js:280:4)",
        "    at Object.handle (/Users/thepumpkin/Projects/testExpressWinston/node_modules/express/lib/router/index.js:45:10)",
        "    at next (/Users/thepumpkin/Projects/testExpressWinston/node_modules/express/node_modules/connect/lib/http.js:204:15)",
        "    at done (/Users/thepumpkin/Dropbox/Projects/express-winston/index.js:91:14)",
        "    at /Users/thepumpkin/Dropbox/Projects/express-winston/node_modules/async/lib/async.js:94:25",
        "    at [object Object].log (/Users/thepumpkin/Projects/testExpressWinston/node_modules/winston/lib/winston/transports/console.js:87:3)"
      ],
      "req": {
        "httpVersion": "1.1",
        "headers": {
          "host": "localhost:3000",
          "connection": "keep-alive",
          "cache-control": "max-age=0",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11",
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-encoding": "gzip,deflate,sdch",
          "accept-language": "en-US,en;q=0.8,es-419;q=0.6,es;q=0.4",
          "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
          "cookie": "connect.sid=nGspCCSzH1qxwNTWYAoexI23.seE%2B6WhmcwdzFEjqhMDuIIl3mAUY7dT4vn%2BkWvRPhZc"
        },
        "url": "/error",
        "method": "GET",
        "originalUrl": "/error",
        "query": {}
      },
      "level": "error",
      "message": "middlewareError"
    }

## Global Whitelists and Blacklists

Express-winston exposes three whitelists that control which properties of the `request`, `body`, and `response` are logged:

* `requestWhitelist`
* `bodyWhitelist`, `bodyBlacklist`
* `responseWhitelist`

For example, `requestWhitelist` defaults to:

    ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query'];

Only those properties of the request object will be logged. Set or modify the whitelist as necessary.

For example, to include the session property (the session data), add the following during logger setup:

    expressWinston.requestWhitelist.push('session');

The blacklisting excludes certain properties and keeps all others. If both `bodyWhitelist` and `bodyBlacklist` are set
the properties excluded by the blacklist are not included even if they are listed in the whitelist!

Example:

    expressWinston.bodyBlacklist.push('secretid', 'secretproperty');

Note that you can log the whole request and/or response body:

    expressWinston.requestWhitelist.push('body');
    expressWinston.responseWhitelist.push('body');

## Route-Specific Whitelists and Blacklists

New in version 0.2.x is the ability to add whitelist elements in a route.  express-winston adds a `_routeWhitelists` object to the `req`uest, containing `.body`, `.req` and .res` properties, to which you can set an array of 'whitelist' parameters to include in the log, specific to the route in question:

``` js
    router.post('/user/register', function(req, res, next) {
      req._routeWhitelists.body = ['username', 'email', 'age']; // But not 'password' or 'confirm-password' or 'top-secret'
      req._routeWhitelists.res = ['_headers'];
    });
```

Post to `/user/register` would give you something like the following:

    {
      "req": {
        "httpVersion": "1.1",
        "headers": {
          "host": "localhost:3000",
          "connection": "keep-alive",
          "accept": "*/*",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11",
          "accept-encoding": "gzip,deflate,sdch",
          "accept-language": "en-US,en;q=0.8,es-419;q=0.6,es;q=0.4",
          "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
          "cookie": "connect.sid=nGspCCSzH1qxwNTWYAoexI23.seE%2B6Whmcwd"
        },
        "url": "/",
        "method": "GET",
        "originalUrl": "/",
        "query": {},
        "body": {
          "username": "foo",
          "email": "foo@bar.com",
          "age": "72"
        }
      },
      "res": {
        "statusCode": 200
      },
      "responseTime" : 12,
      "level": "info",
      "message": "HTTP GET /favicon.ico"
    }

Blacklisting supports only the `body` property.


``` js
    router.post('/user/register', function(req, res, next) {
      req._routeWhitelists.body = ['username', 'email', 'age']; // But not 'password' or 'confirm-password' or 'top-secret'
      req._routeBlacklists.body = ['username', 'password', 'confirm-password', 'top-secret'];
      req._routeWhitelists.res = ['_headers'];
    });
```

If both `req._bodyWhitelist.body` and `req._bodyBlacklist.body` are set the result will be the white listed properties
excluding any black listed ones. In the above example, only 'email' and 'age' would be included.


## Custom Status Levels

If you set statusLevels to true express-winston will log sub 400 responses at info level, sub 500 responses as warnings and 500+ responses as errors. To change these levels specify an object as follows
```json
  "statusLevels": {
    "success": "debug",
    "warn": "debug",
    "error": "info"
  }
```

## Dynamic Status Levels

If you set statusLevels to false and assign a function to level, you can customize the log level for any scenario.

```js
  statusLevels: false // default value
  level: function (req, res) {
    var level = "";
    if (res.statusCode >= 100) { level = "info"; }
    if (res.statusCode >= 400) { level = "warn"; }
    if (res.statusCode >= 500) { level = "error"; }
    // Ops is worried about hacking attempts so make Unauthorized and Forbidden critical
    if (res.statusCode == 401 || res.statusCode == 403) { level = "critical"; }
    // No one should be using the old path, so always warn for those
    if (req.path === "/v1" && level === "info") { level = "warn"; }
    return level;
  }
```


## Dynamic meta data from request or response

If you set dynamicMeta function you can extract additional meta data fields from request or response objects.
The function can be used to either select relevant elements in request or response body without logging them as a whole
or to extract runtime data like the user making the request. The example below logs the user name and role as assigned
by the passport authentication middleware.

```js
   meta: true,
   dynamicMeta: function(req, res) {
     return {
       user: req.user ? req.user.username : null,
       role: req.user ? req.user.role : null,
       ...
   }
}
```

## Tests

Run the basic Mocha tests:

    npm test

Run the Travis-CI tests (which will fail with < 100% coverage):

    npm run test-travis

Generate the `coverage.html` coverage report:

    npm run test-coverage

## Issues and Collaboration

If you ran into any problems, please use the project [Issues section](https://github.com/bithavoc/express-winston/issues) to search or post any bug.

## Contributors

* [Johan Hernandez](https://github.com/bithavoc) (https://github.com/bithavoc)
* [Lars Jacob](https://github.com/jaclar) (https://github.com/jaclar)
* [Jonathan Lomas](https://github.com/floatingLomas) (https://github.com/floatingLomas)
* [Ross Brandes](https://github.com/rosston) (https://github.com/rosston)

Also see AUTHORS file, add yourself if you are missing.

## MIT License

Copyright (c) 2012-2014 Bithavoc.io and Contributors - http://bithavoc.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
