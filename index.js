'use strict';

var _ = require('lodash');
var loaderUtils = require('loader-utils');
var elmCompiler = require('node-elm-compiler');

var cachedDependencies = [];

var defaultOptions = {
  cache: false,
  yes: true
};

var getInput = function() {
  return loaderUtils.getRemainingRequest(this);
};

var getOptions = function() {
  var globalOptions = this.options.elm || {};
  var loaderOptions = loaderUtils.parseQuery(this.query);
  return _.extend({
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
    throw 'elm-webpack-loader currently only supports async mode.'
  }

  var input = getInput.call(this);
  var options = getOptions.call(this);

  if (!options.cache || cachedDependencies.length === 0) {
    elmCompiler.findAllDependencies(input).then(addDependencies.bind(this));
  }

  elmCompiler.compileToString(input, options)
    .then(function(result) {
      var resultWithExports = [result, 'module.exports = Elm;'].join('\n');
      callback(null, resultWithExports);
    })
    .catch(function(err) {
      callback('Compiler process exited with error ' + err);
    });
}
