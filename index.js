'use strict';

var _           = require('lodash');
var compile     = require("node-elm-compiler").compile;
var loaderUtils = require("loader-utils");
var fs          = require("fs");

var defaultOptions = {
  yes: true
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
  var output      = loaderUtils.getCurrentRequest(this);
  var options     = loaderUtils.parseQuery(this.query);
  var compileOpts = _.defaults({output: output, warn: emitWarning}, options, defaultOptions);

  try {
    compile(sourceFiles, compileOpts).on("close", function(exitCode) {
      if (exitCode === 0) {
        fs.readFile(output, "utf8", function(err, result) {
          var resultWithExports = [result, "module.exports = Elm;"].join("\n");

          callback(err, resultWithExports);
        });
      } else {
        callback("Compiler process exited with code " + exitCode);
      }
    });
  } catch (err) {
    callback("An exception occurred when attempting to run the Elm compiler.");
  }
}
