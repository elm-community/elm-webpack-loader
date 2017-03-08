'use strict';

const fs = require('fs');
const path = require('path');
const loaderUtils = require('loader-utils');
const elmCompiler = require('node-elm-compiler');
const yargs = require('yargs');


const RUNNING_INSTANCE_INTERVAL = 200;
const cachedDependencies = [];
let cachedDirDependencies = [];
let runningInstances = 0;
const alreadyCompiledFiles = [];

const defaultOptions = {
  cache: false,
  forceWatch: false,
  yes: true
};

/**
 * @this LoaderContext
 *
 * @return {String} path to resource
 */
function getInput() {
  return this.resourcePath;
}

/**
 * @this LoaderContext
 *
 * @return {Object} loader options
 */
function getOptions() {
  const globalOptions = this.options.elm || {};
  const loaderOptions = loaderUtils.getOptions(this) || {};

  return Object.assign({
    emitWarning: this.emitWarning
  }, defaultOptions, globalOptions, loaderOptions);
}

/**
 * @this LoaderContext
 * @param {String} dependency path to dependency
 *
 * @return {void}
 */
function _addDependencies(dependency) {
  cachedDependencies.push(dependency);
  this.addDependency(dependency);
}

/**
 * @this LoaderContext
 * @param {String[]} dirs list of paths to dependencies
 *
 * @return {void}
 */
function _addDirDependency(dirs) {
  const uniqueDirs = dirs.filter(dir => cachedDirDependencies.indexOf(dir) === -1);

  cachedDirDependencies = cachedDirDependencies.concat(uniqueDirs);
  uniqueDirs.forEach(this.addContextDependency.bind(this));
}

/**
 * Figures out if webpack has been run in watch mode
 * This currently means either that the `watch` command was used
 * Or it was run via `webpack-dev-server`
 *
 * @return {Boolean} watch mode was enabled
 */
function isInWatchMode() {
  // parse the argv given to run this webpack instance
  const { argv } = yargs(process.argv).alias('w', 'watch');
  const hasWatchArg = typeof argv.watch !== 'undefined' && argv.watch;
  const hasWebpackDevServer = Array.prototype.filter.call(
    process.argv,
    arg => arg.indexOf('webpack-dev-server') !== -1
  ).length > 0;

  return hasWebpackDevServer || hasWatchArg;
}

/**
 * Takes a working dir, tries to read elm-package.json,
 * then grabs all the modules from in there
 *
 * @param {String} cwd path to cwd
 *
 * @return {String[]} list of paths to watched directories
 */
function filesToWatch(cwd) {
  const readFile = fs.readFileSync(path.join(cwd, 'elm-package.json'), 'utf8');
  const elmPackage = JSON.parse(readFile);
  const paths = elmPackage[ 'source-directories' ].map(dir => path.join(cwd, dir));

  return paths;
}

/**
 * @this LoaderContext
 *
 * @return {void}
 */
module.exports = function ElmWebpackLoader() {
  if (this.cacheable) {
    this.cacheable();
  }

  const callback = this.async();

  if (!callback) {
    throw new Error('elm-webpack-loader currently only supports async mode.');
  }

  // bind helper functions to `this`
  const addDependencies = _addDependencies.bind(this);
  const addDirDependency = _addDirDependency.bind(this);
  const emitError = this.emitError.bind(this);

  const input = getInput.call(this);
  const options = getOptions.call(this);

  const promises = [];

  // we only need to track deps if we are in watch mode
  // otherwise, we trust elm to do it's job
  if (options.forceWatch || isInWatchMode()) {
    // we can do a glob to track deps we care about if cwd is set
    if (typeof options.cwd !== 'undefined' && options.cwd !== null) {
      // watch elm-package.json
      const elmPackage = path.join(options.cwd, 'elm-package.json');
      const dirs = filesToWatch(options.cwd);

      addDependencies(elmPackage);
      // watch all the dirs in elm-package.json
      addDirDependency.bind(this)(dirs);
    }

    // find all the deps, adding them to the watch list if we successfully parsed everything
    // otherwise return an error which is currently ignored
    const dependencies = elmCompiler.findAllDependencies(input)
      .then(deps => {
        // add each dependency to the tree
        deps.map(addDependencies);

        return {
          kind: 'success',
          result: true
        };
      })
      .catch(v => {
        emitError(v);

        return {
          kind: 'error',
          error: v
        };
      });

    promises.push(dependencies);
  }

  delete options.forceWatch;

  let { maxInstances } = options;

  if (typeof maxInstances === 'undefined') {
    maxInstances = 1;
  } else {
    delete options.maxInstances;
  }

  const intervalId = setInterval(() => {
    if (runningInstances > maxInstances) {
      return;
    }

    runningInstances += 1;
    clearInterval(intervalId);

    // If we are running in watch mode, and we have previously compiled
    // the current file, then let the user know that elm-make is running
    // and can be slow
    if (alreadyCompiledFiles.indexOf(input) > -1) {
      console.log('Started compiling Elm..');
    }

    const compilation = elmCompiler.compileToString(input, options)
      .then(v => {
        runningInstances -= 1;

        return {
          kind: 'success',
          result: v
        };
      })
      .catch(v => {
        runningInstances -= 1;

        return {
          kind: 'error',
          error: v
        };
      });

    promises.push(compilation);

    Promise.all(promises)
      .then(results => {
        const output = results[ results.length - 1 ]; // compilation output is always last

        if (output.kind === 'success') {
          alreadyCompiledFiles.push(input);
          callback(null, output.result);
        } else {
          output.error.message = `Compiler process exited with error ${output.error.message}`;
          callback(output.error);
        }
      })
      .catch(callback);
  }, RUNNING_INSTANCE_INTERVAL);
};
