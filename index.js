'use strict';

var fs = require("fs")
var path = require('path')
var loaderUtils = require('loader-utils');
var elmCompiler = require('node-elm-compiler');
var yargs = require('yargs');

var cachedDependencies = [];
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
var filesToWatch = function(cwd) {
  var elmPackagePath = path.join(cwd, "elm-package.json");
  var readFile = fs.readFileSync(elmPackagePath, 'utf8');
  var elmPackage = JSON.parse(readFile);

  var toWatch = [elmPackagePath]; // watch elm-package.json
  return elmPackage["source-directories"].reduce(function(files, dir) {
    return files.concat(filesForSourcePath(path.join(cwd, dir)));
  }, toWatch);
};

/* Finds all the modules for a given source directory */
var filesForSourcePath = function(sourcePath) {
  var files = fs.readdirSync(sourcePath, 'utf8');
  return files.reduce(function(files, fileName) {
    var filePath = path.join(sourcePath, fileName);

    // .elm = Elm module, .js = possible Elm native module
    if (fileName.endsWith('.elm') || fileName.endsWith('.js')) {
      return files.concat(filePath);
    }

    // recurse into subdirectories
    if (fs.lstatSync(path.join(sourcePath, fileName)).isDirectory()) {
      return files.concat(filesForSourcePath(filePath));
    }

    return files;
  }, []);
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
      addDependencies.call(this, filesToWatch(options.cwd));
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
      .catch(function(v) { return { kind: 'error', error: v }; });

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
