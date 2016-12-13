'use strict';

var loaderUtils = require('loader-utils');
var elmCompiler = require('node-elm-compiler');
var yargs = require('yargs');

var cachedDependencies = [];

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

  return typeof argv.watch !== "undefined" && argv.watch;
};

module.exports = function() {
  this.cacheable && this.cacheable();

  var callback = this.async();

  if (!callback) {
    throw 'elm-webpack-loader currently only supports async mode.';
  }

  var input = getInput.call(this);
  var options = getOptions.call(this);

  var compilation = elmCompiler.compileToString(input, options)
    .then(function(v) { return { kind: 'success', result: v }; })
    .catch(function(v) { return { kind: 'error', error: v }; });

  var promises = [compilation];

  // we only need to track deps if we are in watch mode
  // otherwise, we trust elm to do it's job
  if (isInWatchMode()){
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
