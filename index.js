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
  return this.resourcePath;
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
    throw 'elm-webpack-loader currently only supports async mode.';
  }

  var input = getInput.call(this);
  var options = getOptions.call(this);

  var dependencies = Promise.resolve()
    .then(function() {
      if (!options.cache || cachedDependencies.length === 0) {
        return elmCompiler.findAllDependencies(input).then(addDependencies.bind(this));
      }
    }.bind(this));

  var compilation = elmCompiler.compileToString(input, options);

  Promise.all([dependencies, compilation])
    .then(function(results) {
      var output = results[1]; // compilation output

      callback(null, output);
    })
    .catch(function(err) {
      err.message = 'Compiler process exited with error ' + err.message;
      callback(err);
    });
}
