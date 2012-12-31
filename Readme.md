# express-winston
[![Build Status](https://secure.travis-ci.org/firebaseco/express-winston.png)](http://travis-ci.org/firebaseco/express-winston)

> [winston](https://github.com/flatiron/winston) middleware for express.js

## Installation

    npm install express-winston

## Usage

express-winston provides middlewares for request and error logging of your express.js application.  It uses 'whitelists' to select properties from the request and (new in 0.2.x) response objects.

### Error Logging

Use `expressWinston.errorLogger(options)` to create a middleware that log the errors of the pipeline.

``` js
    app.use(app.router); // notice how the router goes first.
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

### Options

``` js
    transports: [<WinstonTransport>], // list of all winston transports instances to use.
    level: String // log level to use, the default is "info".
```

### Request Logging

Use `expressWinston.logger(options)` to create a middleware to log your HTTP requests.

``` js

    app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ]
    }));
    app.use(app.router); // notice how the router goes after the logger.
```

## Examples

``` js
    var express = require('express');
    var expressWinston = require('express-winston');
    var winston = require('winston'); // for transports.Console
    var app = module.exports = express.createServer();

    app.use(express.bodyParser());
    app.use(express.methodOverride());

    // express-winston logger makes sense BEFORE the router.
    app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ]
    }));

    app.use(app.router);

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

    app.get('/error', function(req, res, next) {
      // here we cause an error in the pipeline so we see express-winston in action.
      return next(new Error("This is an error and it should be logged to the console"));
    });

    app.get('/', function(req, res, next) {
      res.write('This is a normal request, it should be logged to the console too');
      res.end();
    });

    app.listen(3000, function(){
      console.log("express-winston demo listening on port %d in %s mode", app.address().port, app.settings.env);
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

## Whitelists
New in version 0.2.x is the ability to add whitelist elements in a route.  express-winston adds a `_routeWhitelists` object to the `req`uest, containing `.body`, `.req` and .res` properties, to which you can set an array of 'whitelist' parameters to include in the log, specific to the route in question:

``` js
    app.post('/user/register', function(req, res, next) {
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

## Tests

    npm test

## Issues and Collaboration

* Implement a chain of requestFilters. Currently only one requestFilter is allowed in the options.

We are accepting pull-request for these features.

If you ran into any problems, please use the project [Issues section](https://github.com/firebaseco/express-winston/issues) to search or post any bug.

## Contributors

* [Johan Hernandez](https://github.com/thepumpkin1979) (https://github.com/thepumpkin1979)
* [Lars Jacob](https://github.com/jaclar) (https://github.com/jaclar)
* [Jonathan Lomas](https://github.com/floatingLomas) (https://github.com/floatingLomas)

## MIT License

Copyright (c) 2012 Firebase.co and Contributors - http://www.firebase.co

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
