var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var compiler = require('node-elm-compiler');
var loader = require('../index.js');

var fixturesDir = path.join(__dirname, 'fixtures');
var badSource = path.join(fixturesDir, 'Bad.elm');
var goodSource = path.join(fixturesDir, 'Good.elm');
var goodDependency = path.join(fixturesDir, 'GoodDependency.elm');
var elmPackage = path.join(fixturesDir, 'elm.json');
var otherElmSourceDir = path.join(__dirname, 'other_elm_source_dir');
var otherDependency = path.join(otherElmSourceDir, 'OtherDependency.elm');
var dashedFixturesDir = path.join(__dirname, 'fixtures - with dashes');
var dashedGoodSource = path.join(dashedFixturesDir, 'Good.elm');

var toString = Object.prototype.toString;

var isArray = function (obj) {
  return toString.call(obj) === '[object Array]';
};

var hash = function (data) {
  return crypto.createHash('md5').update(data).digest('hex');
};

var compile = function (filename) {
  return compiler.compileToString([filename], {cwd: fixturesDir})
    .then(function (data) {
      return data.toString();
    });
};

// Mock of webpack's loader context.
var mock = function (source, query, opts, callback, watchMode, cwd) {
  var emittedError;
  var emittedWarning;
  var addedDependencies = [];
  var addedDirDependencies = [];

  var result = {
    _compiler: { options: {} },
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
    result._compiler.watching = true;
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

  it('uses native webpack loader options when available', function (done) {
    var callback = function (loaderErr, loaderResult) {
      if (loaderErr) return done(loaderErr);

      compiler.compileToString([goodSource], {cwd: fixturesDir, optimize: true})
        .then(function (compilerResult) {
          assert.equal(hash(loaderResult), hash(compilerResult.toString()));
          done();
        }).catch(done);
    };

    context = mock(goodSource, null, null, callback);
    context.getOptions = function () {
      return { cwd: fixturesDir, optimize: true };
    };
    loader.call(context, goodSource);
  });

  it('falls back to loader-utils for loader options', function (done) {
    var callback = function (loaderErr, loaderResult) {
      if (loaderErr) return done(loaderErr);

      compile(goodSource).then(function (compilerResult) {
        assert.equal(hash(loaderResult), hash(compilerResult));
        done();
      }).catch(done);
    };

    context = mock(goodSource, 'cwd=' + encodeURIComponent(fixturesDir), null, callback);
    loader.call(context, goodSource);
  });

  it('compiles resources with dashes and spaces in their paths', function (done) {
    var options = {
      cwd: dashedFixturesDir
    };

    var callback = function (loaderErr, loaderResult) {
      try {
        assert.isNull(loaderErr);
        assert.isString(loaderResult);
        assert.isAbove(loaderResult.length, 0);
        done();
      } catch (assertionError) {
        done(assertionError);
      }
    };

    context = mock(dashedGoodSource, null, options, callback);
    loader.call(context, dashedGoodSource);
  });

  it('quotes compiler source paths on Windows', function (done) {
    var originalCompile = compiler.compile;
    var originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    var compilerSources;
    var fakeCompiler = new EventEmitter();
    fakeCompiler.stderr = new EventEmitter();

    var restore = function () {
      compiler.compile = originalCompile;
      Object.defineProperty(process, 'platform', originalPlatform);
    };

    compiler.compile = function (sources) {
      compilerSources = sources;
      process.nextTick(function () { fakeCompiler.emit('close', 1); });
      return fakeCompiler;
    };
    Object.defineProperty(process, 'platform', { value: 'win32' });

    var callback = function () {
      restore();
      try {
        assert.deepEqual(compilerSources, ['"' + goodSource + '"']);
        done();
      } catch (assertionError) {
        done(assertionError);
      }
    };

    context = mock(goodSource, null, { cwd: fixturesDir }, callback);
    try {
      loader.call(context, goodSource);
    } catch (err) {
      restore();
      done(err);
    }
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

  it('adds imported files from all source directories on each watch build', function (done) {
    var options = {
      cwd: fixturesDir
    };

    var assertDependencies = function (loaderContext) {
      assert.equal(loaderContext.addedDependencies().length, 3);
      assert.include(loaderContext.addedDependencies(), elmPackage);
      assert.include(loaderContext.addedDependencies(), goodDependency);
      assert.include(loaderContext.addedDependencies(), otherDependency);
      assert.equal(loaderContext.addedDirDependencies().length, 0);
    };

    process.argv = [ "--watch" ];
    var callback = function (loaderErr) {
      if (loaderErr) return done(loaderErr);

      try {
        assertDependencies(context);
      } catch (assertionError) {
        return done(assertionError);
      }

      context = mock(goodSource, null, options, function (secondLoaderErr) {
        if (secondLoaderErr) return done(secondLoaderErr);

        try {
          assertDependencies(context);
          done();
        } catch (assertionError) {
          done(assertionError);
        }
      }, true);
      loader.call(context, goodSource);
    };

    context = mock(goodSource, null, options, callback, true);
    loader.call(context, goodSource);
  });

  it('adds file dependencies with webpack filesystem caching', function (done) {
    var options = {
      cwd: fixturesDir
    };

    process.argv = [];
    var callback = function () {
      assert.equal(context.addedDependencies().length, 3);
      assert.include(context.addedDependencies(), elmPackage);
      assert.include(context.addedDependencies(), goodDependency);
      assert.include(context.addedDependencies(), otherDependency);
      assert.equal(context.addedDirDependencies().length, 0);
      done();
    };

    context = mock(goodSource, null, options, callback);
    context._compiler.options.cache = { type: 'filesystem' };
    loader.call(context, goodSource);
  });

  it('emits warnings for unknown compiler options', function (done) {
    var options = {
      cwd: fixturesDir,
      foo: 'bar'
    };

    var callback = function (err) {
      assert.isPrototypeOf(err, Error);
      assert.match(err.message, /unknown Elm compiler option/i);
      done();
    };

    context = mock(goodSource, null, options, callback);
    loader.call(context, goodSource);
  });

  it('compiles successfully with runtimeOptions', function (done) {
    var options = {
      cwd: fixturesDir,
      runtimeOptions: '-s'
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

  it('emits errors for incorrect source files', function (done) {
    var options = {
      cwd: fixturesDir
    };

    var callback = function (err) {
      try {
        assert.match(err.message, /Bad\.elm/);
        assert.match(err.message, /UNFINISHED MODULE DECLARATION/i);
        done();
      } catch (assertionError) {
        done(assertionError);
      }
    };

    context = mock(badSource, null, options, callback);
    loader.call(context, badSource);
  });

  it('requires maxInstances to be a positive integer', function () {
    [0, -1, 1.5, '1'].forEach(function (maxInstances) {
      context = mock(goodSource, null, { cwd: fixturesDir, maxInstances: maxInstances }, function () {});
      assert.throw(function () {
        loader.call(context, goodSource);
      }, /maxInstances option must be a positive integer/);
    });
  });

  it('serializes compiler processes and continues after errors', function (done) {
    this.timeout(2000);

    var originalCompile = compiler.compile;
    var processes = [];
    var callbacks = [];
    var finished = false;

    var finish = function (err) {
      if (finished) return;
      finished = true;
      compiler.compile = originalCompile;
      done(err);
    };

    var complete = function (label, err) {
      if (err) return finish(err);
      callbacks.push(label);
      if (callbacks.length === 3) {
        try {
          assert.deepEqual(callbacks.sort(), ['first', 'second', 'third']);
          assert.lengthOf(processes, 3);
          finish();
        } catch (assertionError) {
          finish(assertionError);
        }
      }
    };

    compiler.compile = function (sources, options) {
      var child = new EventEmitter();
      child.stderr = new EventEmitter();
      var index = processes.length;
      processes.push(child);

      process.nextTick(function () {
        try {
          assert.lengthOf(processes, index + 1);
          if (index === 1) {
            child.stderr.emit('data', Buffer.from('simulated failure'));
            child.emit('close', 1);
            return;
          }
          fs.writeFileSync(options.output, index === 0 ? 'first' : 'third');
          child.emit('close', 0);
        } catch (assertionError) {
          finish(assertionError);
        }
      });

      return child;
    };

    loader.call(mock(goodSource, null, { cwd: fixturesDir }, function (err, result) {
      try {
        assert.isNull(err);
        assert.equal(result, 'first');
        complete('first');
      } catch (assertionError) {
        complete('first', assertionError);
      }
    }));

    loader.call(mock(goodSource, null, { cwd: fixturesDir }, function (err) {
      try {
        assert.isPrototypeOf(err, Error);
        assert.include(err.message, 'Compilation failed! simulated failure');
        assert.notInclude(err.message, 'releaseLock');
        complete('second');
      } catch (assertionError) {
        complete('second', assertionError);
      }
    }));

    loader.call(mock(goodSource, null, { cwd: fixturesDir }, function (err, result) {
      try {
        assert.isNull(err);
        assert.equal(result, 'third');
        complete('third');
      } catch (assertionError) {
        complete('third', assertionError);
      }
    }));
  });

  it('allows concurrent compiler processes up to maxInstances', function (done) {
    this.timeout(2000);

    var originalCompile = compiler.compile;
    var processes = [];
    var active = 0;
    var maxActive = 0;
    var callbacks = [];
    var finished = false;

    var finish = function (err) {
      if (finished) return;
      finished = true;
      compiler.compile = originalCompile;
      done(err);
    };

    var complete = function (label, err, result) {
      try {
        assert.isNull(err);
        assert.equal(result, label);
        callbacks.push(label);
        if (callbacks.length === 3) {
          assert.deepEqual(callbacks.sort(), ['first', 'second', 'third']);
          assert.lengthOf(processes, 3);
          assert.equal(maxActive, 2);
          finish();
        }
      } catch (assertionError) {
        finish(assertionError);
      }
    };

    compiler.compile = function (sources, options) {
      var child = new EventEmitter();
      child.stderr = new EventEmitter();
      child.options = options;
      var index = processes.length;
      processes.push(child);
      active += 1;
      maxActive = Math.max(maxActive, active);
      child.on('close', function () { active -= 1; });

      try {
        assert.isUndefined(options.maxInstances);
        if (index === 1) {
          fs.writeFileSync(processes[0].options.output, 'first');
          process.nextTick(function () { processes[0].emit('close', 0); });
        } else if (index === 2) {
          fs.writeFileSync(processes[1].options.output, 'second');
          fs.writeFileSync(processes[2].options.output, 'third');
          process.nextTick(function () {
            processes[1].emit('close', 0);
            processes[2].emit('close', 0);
          });
        }
      } catch (assertionError) {
        finish(assertionError);
      }

      return child;
    };

    ['first', 'second', 'third'].forEach(function (label) {
      loader.call(mock(goodSource, null, { cwd: fixturesDir, maxInstances: 2 }, function (err, result) {
        complete(label, err, result);
      }));
    });
  });

});
