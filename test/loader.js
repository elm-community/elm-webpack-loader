'use strict';

const path = require('path');
const crypto = require('crypto');
const { assert } = require('chai');
const compiler = require('node-elm-compiler');
const loader = require('../index.js');

const fixturesDir = path.join(__dirname, 'fixtures');
const badSource = path.join(fixturesDir, 'Bad.elm');
const goodSource = path.join(fixturesDir, 'Good.elm');
const elmPackage = path.join(fixturesDir, 'elm-package.json');

const { toString } = Object.prototype;

function isArray(obj) {
  return toString.call(obj) === '[object Array]';
}

function hash(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}

function compile(filename) {
  return compiler.compileToString([ filename ], {
    yes: true,
    cwd: fixturesDir
  })
    .then(data => data.toString());
}

// Mock of webpack's loader context.
function mock(source, query, opts, callback, watchMode, cwd) {
  let emittedError = null;
  let emittedWarning = null;
  const addedDependencies = [];
  const addedDirDependencies = [];

  const result = {
    loaders: [],
    loaderIndex: 0,

    resource: source,
    resourcePath: source,

    async: () => callback,

    emitError: err => {
      emittedError = err;
    },
    emittedError: () => emittedError,
    emitWarning: warn => {
      emittedWarning = warn;
    },
    emittedWarning: () => emittedWarning,

    addDependency: dep => {
      addedDependencies.push(dep);
    },
    addContextDependency: dir => {
      addedDirDependencies.push(dir);
    },
    addedDependencies: () => addedDependencies,
    addedDirDependencies: () => addedDirDependencies,

    cacheable: () => {},

    options: {}
  };

  if (isArray(query)) {
    result.query = `?${query.join('&')}`;
  } else if (query) {
    result.query = `?${query}`;
  }

  if (opts) {
    result.options.elm = opts;
  }

  if (cwd) {
    result.options.cwd = './';
  }

  if (watchMode) {
    result.isInWatchMode = () => true;
    result.argv = {
      watch: true
    };
  }

  return result;
}

describe('sync mode', () => {
  let context = null;

  it('throws', () => {
    context = mock(goodSource);

    assert.throw(() => {
      loader.call(context, goodSource);
    }, /currently only supports async mode/);
  });
});

describe('async mode', () => {
  let context = null;

  // Download of Elm can take a while.
  this.timeout(600000);

  it('compiles the resource', done => {
    const options = {
      cwd: fixturesDir
    };

    function callback(loaderErr, loaderResult) {
      compile(goodSource).then(compilerResult => {
        assert.equal(hash(loaderResult), hash(compilerResult));
        done();
      });
    }

    context = mock(goodSource, null, options, callback);
    loader.call(context, goodSource);
  });

  it('does not add dependencies in normal mode', done => {
    const options = {
      cwd: fixturesDir
    };

    process.argv = [];
    function callback() {
      assert.equal(context.addedDependencies().length, 0);
      assert.equal(context.addedDirDependencies().length, 0);
      done();
    }

    context = mock(goodSource, null, options, callback);
    loader.call(context, goodSource);
  });

  it('does add dependencies in watch mode', done => {
    const options = {
      cwd: fixturesDir
    };

    process.argv = [ '--watch' ];
    function callback() {
      assert.equal(context.addedDependencies().length, 2);
      assert.include(context.addedDependencies(), elmPackage);
      assert.equal(context.addedDirDependencies().length, 1);
      assert.include(context.addedDirDependencies(), fixturesDir);
      done();
    }

    context = mock(goodSource, null, options, callback, true);
    loader.call(context, goodSource);
  });

  it('emits warnings for unknown compiler options', done => {
    const options = {
      cwd: fixturesDir,
      foo: 'bar'
    };

    function callback() {
      assert.match(context.emittedWarning(), /unknown Elm compiler option/i);
      done();
    }

    context = mock(goodSource, null, options, callback);
    loader.call(context, goodSource);
  });

  xit('emits errors for incorrect source files', done => {
    const options = {
      cwd: fixturesDir
    };

    function callback() {
      assert.match(context.emittedError(), /syntax problem/i);
      done();
    }

    context = mock(badSource, null, options, callback);
    loader.call(context, badSource);
  });
});
