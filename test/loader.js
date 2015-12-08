var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var compiler = require('node-elm-compiler');
var loader = require('../index.js');

var badSource = path.join(__dirname, './fixtures/Bad.elm');
var goodSource = path.join(__dirname, './fixtures/Good.elm');

var toString = Object.prototype.toString;

var isArray = function (obj) {
  return toString.call(obj) === '[object Array]';
};

var hash = function (data) {
  return crypto.createHash('md5').update(data).digest('hex');
};

var compile = function (filename, callback) {
  var output = 'test/expected/' + path.basename(filename, '.elm') + '.js';

  compiler.compile([filename], {
    output: output,
    yes: true
  }).on('close', function (exit) {
    if (exit === 0) {
      var contents = fs.readFileSync(output, 'utf-8');
      contents = [contents, 'module.exports = Elm;'].join('\n');
      callback(null, contents);
    } else {
      callback('Error compiling file.');
    }
  });
}

// Mock of webpack's loader context.
var mock = function (source ,query, opts, callback) {
  var emittedError;
  var emittedWarning;

  var result = {
    loaders: [],
    loaderIndex: 0,

    resource: source,
    resourcePath: source,

    async: function () { return callback; },

    emitError: function (err) { emittedError = err; },
    emittedError: function () { return emittedError; },
    emitWarning: function (warn) { emittedWarning = warn; },
    emittedWarning: function () { return emittedWarning; },

    addDependency: function () {},
    cacheable: function () {},

    options: {}
  };

  if (query) {
    result.query = '?' + (isArray(query) ? query.join('&') : query);
  }

  if (opts) {
    result.options.ulmus = opts;
  }

  return result;
};

module.exports.test = {
  'sync mode': {
    'throws': function (test) {
      var context = mock(goodSource);

      try {
        loader.call(context, goodSource);
      } catch (err) {
        test.done();
      }
    }
  },

  'async mode': {
    'compiles the resource': function (test) {
      var context;

      var callback = function (loaderErr, loaderResult) {
        compile([goodSource], function (compilerErr, compilerResult) {
          test.equal(null, loaderErr);
          test.equal(hash(loaderResult), hash(compilerResult));
          test.done();
        });
      };

      context = mock(goodSource, null, null, callback);
      loader.call(context, goodSource);
    },

    'emits warnings': function (test) {
      var context;

      var callback = function () {
        test.equal(undefined, context.emittedWarning());
        test.done();
      };

      context = mock(badSource, null, null, callback);
      loader.call(context, badSource);
    },

    'can emit errors instead of warnings': function (test) {
      var context;

      var callback = function () {
        test.equal(undefined, context.emittedError());
        test.done();
      };

      context = mock(badSource, null, {emitErrors: true}, callback);
      loader.call(context, badSource);
    }
  }

};
