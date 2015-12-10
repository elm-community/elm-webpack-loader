'use strict';

var _            = require('lodash');
var elmCompiler  = require("node-elm-compiler");
var fs           = require("fs");
var loaderUtils  = require("loader-utils");

var defaultOptions = {
  cache: false,
  yes: true,
  output: "[name].js"
};

var cachedDependencies = [];

module.exports = function(source) {
  this.cacheable && this.cacheable();

  var callback = this.async();

  if (!callback) {
    throw "elm-webpack-loader currently only supports async mode."
  }

  var emitWarning = this.emitWarning.bind(this);
  var emitError   = this.emitError.bind(this);

  var sourceFiles = loaderUtils.getRemainingRequest(this);
  var options     = loaderUtils.parseQuery(this.query);

  var output = loaderUtils.interpolateName(this, defaultOptions.output, {
    context: options.context || this.options.context,
    content: source,
    regExp:  options.regExp
  });

  var compileOpts = _.defaults({ output: output, warn: emitWarning }, options, defaultOptions);
  delete compileOpts.cache;

  if (!options.cache || cachedDependencies.length == 0) {
    elmCompiler.findAllDependencies(sourceFiles).then(function(dependencies) {
      cachedDependencies = dependencies;
      for (var i = 0; i < dependencies.length; i++) {
        this.addDependency(dependencies[i]);
      }
    }.bind(this));
  }

  elmCompiler.compileToString(sourceFiles, compileOpts).then(function(result) {
    var resultWithExports = [result, "module.exports = Elm;"].join("\n");
    callback(null, resultWithExports);
  }, function(err) {
    callback("Compiler process exited with code " + exitCode);
  });

}
