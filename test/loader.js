var path = require('path');
var crypto = require('crypto');
var assert = require('chai').assert;
var compiler = require('node-elm-compiler');
var loader = require('../index.js');

var fixturesDir = path.join(__dirname, 'fixtures');
var badSource = path.join(fixturesDir, 'Bad.elm');
var goodSource = path.join(fixturesDir, 'Good.elm');

var toString = Object.prototype.toString;

var isArray = function (obj) {
  return toString.call(obj) === '[object Array]';
};

var hash = function (data) {
  return crypto.createHash('md5').update(data).digest('hex');
};

var compile = function (filename) {
  return compiler.compileToString([filename], {yes: true, cwd: fixturesDir})
    .then(function (data) {
      return [data.toString(), 'module.exports = Elm;'].join('\n');
    });
}

// Mock of webpack's loader context.
var mock = function (source, query, opts, callback) {
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
    result.options.elm = opts;
  }

  return result;
};

describe('sync mode', function () {
  var context;

  it('throws', function () {
    context = mock(goodSource);

    assert.throw(function () {
      loader.call(context, goodSource);
    }, /currently only supports async mode/);
  });
});

describe('async mode', function () {
  var context;

  // Download of Elm can take a while.
  this.timeout(300000);

  it('compiles the resource', function (done) {
    var options = {
      cwd: fixturesDir
    };

    var callback = function (loaderErr, loaderResult) {
      compile(goodSource).then(function (compilerResult) {
        assert.equal(hash(loaderResult), hash(compilerResult));
        done();
      });
    };

    context = mock(goodSource, null, options, callback);
    loader.call(context, goodSource);
  });

  it('emits warnings', function (done) {
    var options = {
      cwd: fixturesDir
    };

    var callback = function () {
      assert.equal(undefined, context.emittedWarning());
      done();
    };

    context = mock(badSource, null, options, callback);
    loader.call(context, badSource);
  });

  it('can emit errors instead of warnings', function (done) {
    var options = {
      cwd: fixturesDir,
      emitErrors: true
    };

    var callback = function () {
      assert.equal(undefined, context.emittedError());
      done();
    };

    context = mock(badSource, null, options, callback);
    loader.call(context, badSource);
  });

});
