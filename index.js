'use strict';

var fs = require("fs")
var path = require('path')
var loaderUtils = require('loader-utils');
var elmCompiler = require('node-elm-compiler');
var yargs = require('yargs');

var cachedDependencies = [];
var cachedDirDependencies = [];

var defaultOptions = {
  cache: false,
  yes: true
};

var getInput = function (options) {
  var input = this.resourcePath;

  if (options.modules) {
    var modules = options.modules;

    if (!Array.isArray(modules)) {
      throw new Error('modules option must be an array');
    }

    if (modules.indexOf(input) === -1) {
      modules.push(input);
    }

    input = modules;

    delete options.modules;
  }
  return input;
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

  var options = getOptions.call(this);  
  var input = getInput.call(this, options);

  var compilation = elmCompiler.compileToString(input, options)
    .then(function(v) { return { kind: 'success', result: v }; })
    .catch(function(v) { return { kind: 'error', error: v }; });

  var promises = [compilation];

  // we only need to track deps if we are in watch mode
  // otherwise, we trust elm to do it's job
  if (isInWatchMode()){
    // we can do a glob to track deps we care about if cwd is set
    if (typeof options.cwd !== "undefined" && options.cwd !== null){
      // watch elm-package.json
      addDependencies.bind(this)([path.join(options.cwd, "elm-package.json")]);
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


  Promise.all(promises)
    .then(function(results) {
      var output = results[0]; // compilation output
      if (output.kind == 'success') {
        callback(null, output.result);
      } else {
        output.error.message = 'Compiler process exited with error ' + output.error.message;
        callback(output.error);
      }
    });
}
