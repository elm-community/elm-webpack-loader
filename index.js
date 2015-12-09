'use strict';

var _           = require('lodash');
var compile     = require("node-elm-compiler").compileToString;
var loaderUtils = require("loader-utils");
var fs          = require("fs");

var defaultOptions = {
  yes: true,
  output: "[name].js"
};

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

  compile(sourceFiles, compileOpts).then(function(result) {
    var resultWithExports = [result, "module.exports = Elm;"].join("\n");
    callback(null, resultWithExports);
  }, function(err) {
    callback("Compiler process exited with code " + exitCode);
  });

}
