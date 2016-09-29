'use strict';

var loaderUtils = require('loader-utils');
var elmCompiler = require('node-elm-compiler');

var cachedDependencies = [];

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
  cachedDependencies = dependencies;
  dependencies.forEach(this.addDependency.bind(this));
};

module.exports = function() {
  this.cacheable && this.cacheable();

  var callback = this.async();

  if (!callback) {
    throw 'elm-webpack-loader currently only supports async mode.';
  }

  var options = getOptions.call(this);  
  var input = getInput.call(this, options);

  var dependencies = Promise.resolve()
    .then(function() {
      if (!options.cache || cachedDependencies.length === 0) {
        return elmCompiler.findAllDependencies(input).then(addDependencies.bind(this));
      }
    }.bind(this))
    .then(function(v) { return { kind: 'success', result: v }; })
    .catch(function(v) { return { kind: 'error', error: v }; });

  var compilation = elmCompiler.compileToString(input, options)
    .then(function(v) { return { kind: 'success', result: v }; })
    .catch(function(v) { return { kind: 'error', error: v }; });

  Promise.all([dependencies, compilation])
    .then(function(results) {
      var output = results[1]; // compilation output
      if (output.kind == 'success') {
        callback(null, output.result);
      } else {
        output.error.message = 'Compiler process exited with error ' + output.error.message;
        callback(output.error);
      }
    });
}
