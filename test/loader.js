var path = require('path');
var crypto = require('crypto');
var assert = require('chai').assert;
var compiler = require('node-elm-compiler');
var loader = require('../index.js');

var fixturesDir = path.join(__dirname, 'fixtures');
var badSource = path.join(fixturesDir, 'Bad.elm');
var goodSource = path.join(fixturesDir, 'Good.elm');
var goodDependency = path.join(fixturesDir, 'GoodDependency.elm');
var elmPackage = path.join(fixturesDir, 'elm-package.json');

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
      return data.toString();
    });
}

// Mock of webpack's loader context.
var mock = function (source, query, opts, callback, watchMode, cwd) {
  var emittedError;
  var emittedWarning;
  var addedDependencies = [];
  var addedDirDependencies = [];

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

    addDependency: function (dep) { addedDependencies.push(dep); },
    addContextDependency: function(dir) { addedDirDependencies.push(dir); },
    addedDependencies: function () { return addedDependencies; },
    addedDirDependencies: function() { return addedDirDependencies; },

    cacheable: function () {},

    options: {}
  };

  if (query) {
    result.query = '?' + (isArray(query) ? query.join('&') : query);
  }

  if (opts) {
    result.options.elm = opts;
  }

  if (cwd){
    result.options.cwd = "./"
  }

  if (watchMode) {
    result.isInWatchMode = function() { return true; };
    result.argv = {watch : true};
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
  this.timeout(600000);

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

  it('does not add dependencies in normal mode', function (done) {
    var options = {
      cwd: fixturesDir
    };

    process.argv = [];
    var callback = function () {
      assert.equal(context.addedDependencies().length, 0);
      assert.equal(context.addedDirDependencies().length, 0);
      done();
    };

    context = mock(goodSource, null, options, callback);
    loader.call(context, goodSource);
  });

  it('does add dependencies in watch mode', function (done) {
    var options = {
      cwd: fixturesDir
    };

    process.argv = [ "--watch" ];
    var callback = function () {
      assert.equal(context.addedDependencies().length, 2);
      assert.include(context.addedDependencies(), elmPackage);
      assert.equal(context.addedDirDependencies().length, 1);
      assert.include(context.addedDirDependencies(), fixturesDir);
      done();
    };

    context = mock(goodSource, null, options, callback, true);
    loader.call(context, goodSource);
  });

  it('emits warnings for unknown compiler options', function (done) {
    var options = {
      cwd: fixturesDir,
      foo: 'bar'
    };

    var callback = function () {
      assert.match(context.emittedWarning(), /unknown Elm compiler option/i);
      done();
    };

    context = mock(goodSource, null, options, callback);
    loader.call(context, goodSource);
  });

  xit('emits errors for incorrect source files', function (done) {
    var options = {
      cwd: fixturesDir
    };

    var callback = function () {
      assert.match(context.emittedError(), /syntax problem/i);
      done();
    };

    context = mock(badSource, null, options, callback);
    loader.call(context, badSource);
  });

});
