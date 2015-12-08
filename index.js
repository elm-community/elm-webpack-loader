'use strict';

var _           = require('lodash');
var compile     = require("node-elm-compiler").compile;
var loaderUtils = require("loader-utils");
var fs          = require("fs");
var path        = require('path');
var glob        = require('glob');

var defaultOptions = {
  yes: true,
  output: "tmp/[name].js"
};

var addDependencies = function (basePath, addDependency) {
  glob(basePath + "/**/*.elm", function (err, files) {
    for (var i = 0; i < files.length; i++) {
      addDependency(files[i]);
    }
  });
}

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

  try {
    addDependencies(path.dirname(sourceFiles), this.addDependency);
    compile(sourceFiles, compileOpts).on("close", function(output, exitCode) {
      if (exitCode === 0) {
        fs.readFile(output, "utf8", function(err, result) {
          var resultWithExports = [result, "module.exports = Elm;"].join("\n");

          callback(err, resultWithExports);
        });
      } else {
        callback("Compiler process exited with code " + exitCode);
      }
    }.bind(this, output));
  } catch (err) {
    callback("An exception occurred when attempting to run the Elm compiler.");
  }
}
