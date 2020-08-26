"use strict";

var fs = require("fs");
var path = require("path");
var temp = require("temp").track();
var loaderUtils = require("loader-utils");
var elmCompiler = require("node-elm-compiler");

var getFiles = function(options) {
    var files = options && options.files;

    if (files === undefined) return [this.resourcePath];

    if (!Array.isArray(files)) {
        throw new Error("files option must be an array");
    }

    if (files.length === 0) {
        throw new Error("You specified the 'files' option but didn't list any files");
    }

    delete options.files;
    return files;
};

var getOptions = function(mode) {
    var defaultOptions = {
        debug: mode === "development",
        optimize: mode === "production",
    };

    var globalOptions = this.options
        ? this.options.elm || {}
        : this.query.elm || {};

    var loaderOptions = loaderUtils.getOptions(this) || {};

    return Object.assign({}, defaultOptions, globalOptions, loaderOptions);
};

var _addDependencies = function(dependency) {
    this.addDependency(dependency);
};

var _addDirDependency = function(dirs){
    dirs.forEach(this.addContextDependency.bind(this));
};

var isFlagSet = function(args, flag) {
    return typeof args[flag] !== "undefined" && args[flag];
};

/* Takes a working dir, tries to read elm.json, then grabs all the modules from in there
*/
var filesToWatch = function(cwd){
    var readFile = fs.readFileSync(path.join(cwd, "elm.json"), "utf8");
    var elmPackage = JSON.parse(readFile);

    var paths = elmPackage["source-directories"].map(function(dir){
        return path.join(cwd, dir);
    });

    return paths;
};

var dependenciesFor = function(resourcePath, files) {
    return findAllDependencies(files)
        .then(function (dependencies) {
            return unique(dependencies.concat(remove(resourcePath, files)));
        });
}

var findAllDependencies = function(files) {
    return Promise.all(files.map(
        function(f) { return elmCompiler.findAllDependencies(f) }
    )).then(flatten);
}

module.exports = function() {
    this.cacheable && this.cacheable();

    var callback = this.async();
    if (!callback) {
        throw "elm-webpack-loader currently only supports async mode.";
    }

    var compiler = this._compiler;

    // bind helper functions to `this`
    var addDependencies = _addDependencies.bind(this);
    var addDirDependency = _addDirDependency.bind(this);
    var emitError = this.emitError.bind(this);

    var options = getOptions.call(this, compiler.options.mode);
    var files = getFiles.call(this, options);
    var resourcePath = this.resourcePath;

    var promises = [];


    // we only need to track deps if we are in watch mode
    // otherwise, we trust elm to do it's job
    if (compiler.options.watch) {
        // we can do a glob to track deps we care about if cwd is set
        if (typeof options.cwd !== "undefined" && options.cwd !== null){
            // watch elm.json
            var elmPackage = path.join(options.cwd, "elm.json");
            addDependencies(elmPackage);
            var dirs = filesToWatch(options.cwd);
            // watch all the dirs in elm.json
            addDirDependency.bind(this)(dirs);
        }

        // find all the deps, adding them to the watch list if we successfully parsed everything
        // otherwise return an error which is currently ignored
        var dependencies = dependenciesFor(resourcePath, files).then(function(dependencies){
            // add each dependency to the tree
            dependencies.map(addDependencies);
            return { kind: "success", result: true };
        }).catch(function(v){
            emitError(v);
            return { kind: "error", error: v };
        })

        promises.push(dependencies);
    }

    var compilation = compile(files, options)
        .then(function(v) { return { kind: "success", result: v }; })
        .catch(function(v) { return { kind: "error", error: v }; });

    promises.push(compilation);

    Promise.all(promises)
        .then(function(results) {
            var output = results[results.length - 1]; // compilation output is always last

            if (output.kind === "success") {
                callback(null, output.result);
            } else {
                if (typeof output.error === "string") {
                    output.error = new Error(output.error);
                }

                output.error.message = "Compiler process exited with error " + output.error.message;
                output.error.stack = null;
                callback(output.error);
            }
        }).catch(function(err){
            callback(err);
        });
}


// Functions pulled and modified from node-elm-compiler:

// this was called compileToString
// - altered to log output to console instead to retain formatting
function compile(sources, options) {
    var suffix = getSuffix(options.output, ".js");
    return new Promise(function (resolve, reject) {
        temp.open({ suffix: suffix }, function (err, info) {
            if (err) {
                return reject(err);
            }
            options.output = info.path;
            options.processOpts = { stdio: "inherit" };

            var compiler;

            try {
                compiler = elmCompiler.compile(sources, options);
            }
            catch (compileError) {
                return reject(compileError);
            }

            compiler.on("close", function (exitCode) {
                if (exitCode !== 0) {
                    return reject("Compilation failed");
                }

                fs.readFile(info.path, { encoding: "utf8" }, function (err, data) {
                    return err ? reject(err) : resolve(data);
                });
            });
        });
    });
}

function getSuffix(outputPath, defaultSuffix) {
    if (outputPath) {
        return path.extname(outputPath) || defaultSuffix;
    }
    else {
        return defaultSuffix;
    }
}


// HELPERS

function flatten(arrayOfArrays) {
    return arrayOfArrays.reduce(function(flattened, array) {
        return flattened.concat(array)
    }, []);
}

function unique(items) {
    return items.filter(function(item, index, array) {
        return array.indexOf(item) === index;
    });
}

function remove(condemned, items) {
    return items.filter(function(item) {
        return item !== condemned;
    });
}
