'use strict';

var fs = require("fs")
var path = require('path')
var loaderUtils = require('loader-utils');
var elmCompiler = require('node-elm-compiler');
var yargs = require('yargs');

var runningInstances = 0;
var alreadyCompiledFiles = [];

var defaultOptions = {
  cache: false,
  forceWatch: false,
  yes: true
};

var getInput = function() {
  return this.resourcePath;
};

var getOptions = function() {
  var globalOptions = this.options.elm || {};
  var loaderOptions = loaderUtils.getOptions(this) || {};
  return Object.assign({
    emitWarning: this.emitWarning
  }, defaultOptions, globalOptions, loaderOptions);
};

var _addDependencies = function(dependency) {
  this.addDependency(dependency);
};

var _addDirDependency = function(dirs){
  dirs.forEach(this.addContextDependency.bind(this));
};

/* Figures out if webpack has been run in watch mode
    This currently means either that the `watch` command was used
    Or it was run via `webpack-dev-server`
*/
var isInWatchMode = function(){
  // parse the argv given to run this webpack instance
  var argv = yargs(process.argv)
      .alias('w', 'watch')
      .argv;

  var hasWatchArg = typeof argv.watch !== "undefined" && argv.watch;

  var hasWebpackDevServer = Array.prototype.filter.call(process.argv, function (arg) {
    return arg.indexOf('webpack-dev-server') !== -1;
  }).length > 0;

  return hasWebpackDevServer || hasWatchArg;
};

/* Takes a working dir, tries to read elm-package.json, then grabs all the modules from in there
*/
var filesToWatch = function(cwd){
  var readFile = fs.readFileSync(path.join(cwd, "elm-package.json"), 'utf8');
  var elmPackage = JSON.parse(readFile);

  var paths = elmPackage["source-directories"].map(function(dir){
    return path.join(cwd, dir);
  });

  return paths;
};

module.exports = function() {
  this.cacheable && this.cacheable();

  var callback = this.async();
  if (!callback) {
    throw 'elm-webpack-loader currently only supports async mode.';
  }

  // bind helper functions to `this`
  var addDependencies = _addDependencies.bind(this);
  var addDirDependency = _addDirDependency.bind(this);
  var emitError = this.emitError.bind(this);

  var input = getInput.call(this);
  var options = getOptions.call(this);

  var promises = [];

  // we only need to track deps if we are in watch mode
  // otherwise, we trust elm to do it's job
  if (options.forceWatch || isInWatchMode()){
    // we can do a glob to track deps we care about if cwd is set
    if (typeof options.cwd !== "undefined" && options.cwd !== null){
      // watch elm-package.json
      var elmPackage = path.join(options.cwd, "elm-package.json");
      addDependencies(elmPackage);
      var dirs = filesToWatch(options.cwd);
      // watch all the dirs in elm-package.json
      addDirDependency.bind(this)(dirs);
    }

    // find all the deps, adding them to the watch list if we successfully parsed everything
    // otherwise return an error which is currently ignored
    var dependencies = elmCompiler.findAllDependencies(input).then(function(dependencies){
      // add each dependency to the tree
      dependencies.map(addDependencies);
      return { kind: 'success', result: true };
    }).catch(function(v){
      emitError(v);
      return { kind: 'error', error: v };
    })

    promises.push(dependencies);
  }

  delete options.forceWatch

  var maxInstances = options.maxInstances;

  if (typeof maxInstances === "undefined"){
    maxInstances = 1;
  } else {
    delete options.maxInstances;
  }

  var intervalId = setInterval(function(){
    if (runningInstances > maxInstances) return;
    runningInstances += 1;
    clearInterval(intervalId);

    // If we are running in watch mode, and we have previously compiled
    // the current file, then let the user know that elm-make is running
    // and can be slow
    if (alreadyCompiledFiles.indexOf(input) > -1){
      console.log('Started compiling Elm..');
    }

    var compilation = elmCompiler.compileToString(input, options)
      .then(function(v) { runningInstances -= 1; return { kind: 'success', result: v }; })
      .catch(function(v) { runningInstances -= 1; return { kind: 'error', error: v }; });

    promises.push(compilation);

    Promise.all(promises)
      .then(function(results) {
        var output = results[results.length - 1]; // compilation output is always last

        if (output.kind == 'success') {
          alreadyCompiledFiles.push(input);
          callback(null, output.result);
        } else {
          output.error.message = 'Compiler process exited with error ' + output.error.message;
          callback(output.error);
        }
      }).catch(function(err){
        callback(err);
      });

  }, 200);
}
