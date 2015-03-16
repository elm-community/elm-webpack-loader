/*
 * elm-webpack-loader
 * https://github.com/rfeldman/elm-webpack-loader
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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