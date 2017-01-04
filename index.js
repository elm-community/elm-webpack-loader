'use strict';

var fs = require("fs")
var path = require('path')
var loaderUtils = require('loader-utils');
var elmCompiler = require('node-elm-compiler');
var yargs = require('yargs');

var cachedDependencies = [];
var cachedDirDependencies = [];
var runningInstances = 0;

var defaultOptions = {
  cache: false,
  yes: true
};

var getInput = function() {
  return this.resourcePath;
};

var getOptions = function() {
  var globalOptions = this.options.elm || {};
  var loaderOptions = loaderUtils.parseQuery(this.query);
  return Object.assign({
    emitWarning: this.emitWarning
  }, defaultOptions, globalOptions, loaderOptions);
};

var addDependencies = function(dependencies) {
  cachedDependencies = cachedDependencies.concat(dependencies);
  dependencies.forEach(this.addDependency.bind(this));
};

var addDirDependency = function(dirs){
  cachedDirDependencies = cachedDirDependencies.concat(dirs);
  dirs.forEach(this.addContextDependency.bind(this));
};

var isInWatchMode = function(){
  var argv = yargs(process.argv)
      .alias('w', 'watch')
      .argv;
  var hasWebpackDevServer = Array.prototype.filter.call(process.argv, function (arg) {
    return arg.indexOf('webpack-dev-server') !== -1;
  }).length > 0;
  var hasWatchArg = typeof argv.watch !== "undefined" && argv.watch;

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

  var input = getInput.call(this);
  var options = getOptions.call(this);
  var promises = [];

  // we only need to track deps if we are in watch mode
  // otherwise, we trust elm to do it's job
  if (isInWatchMode()){
    // we can do a glob to track deps we care about if cwd is set
    if (typeof options.cwd !== "undefined" && options.cwd !== null){
      // watch elm-package.json
      var elmPackage = path.join(options.cwd, "elm-package.json");
      addDependencies.bind(this)([elmPackage]);
      var dirs = filesToWatch(options.cwd);
      // watch all the dirs in elm-package.json
      addDirDependency.bind(this)(dirs);
    } else {
      var dependencies = Promise.resolve()
        .then(function() {
          if (!options.cache || cachedDependencies.length === 0) {
            return elmCompiler.findAllDependencies(input).then(addDependencies.bind(this));
          }
        }.bind(this))
        .then(function(v) { return { kind: 'success', result: v }; })
        .catch(function(v) { return { kind: 'error', error: v }; });

      promises.push(dependencies);
    }
  }

  var maxInstances = options.maxInstances;

  if (typeof maxInstances === "undefined"){
    maxInstances = 4;
  } else {
    delete options.maxInstances;
  }

  var intervalId = setInterval(function(){
    if (runningInstances > maxInstances) return;
    runningInstances += 1;
    clearInterval(intervalId);

    var compilation = elmCompiler.compileToString(input, options)
      .then(function(v) { runningInstances -= 1; return { kind: 'success', result: v }; })
      .catch(function(v) { runningInstances -= 1; return { kind: 'error', error: v }; });

    promises.push(compilation);

    Promise.all(promises)
      .then(function(results) {
        var output = results[results.length - 1]; // compilation output is always last

        if (output.kind == 'success') {
          callback(null, output.result);
        } else {
          output.error.message = 'Compiler process exited with error ' + output.error.message;
          callback(output.error);
        }
      });

  }, 200);
}
