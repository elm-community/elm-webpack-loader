"use strict";

var fs = require("fs");
var path = require("path");
var temp = require("temp").track();
var loaderUtils = require("loader-utils");
var elmCompiler = require("node-elm-compiler");

var compilerQueue = [];
var runningInstances = 0;

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
        : this.query && this.query.elm || {};

    var loaderOptions =
        this.getOptions && this.getOptions() ||
        loaderUtils.getOptions(this) || {};

    return Object.assign({}, defaultOptions, globalOptions, loaderOptions);
};

var _addDependencies = function(dependency) {
    this.addDependency(dependency);
};

var isFlagSet = function(args, flag) {
    return typeof args[flag] !== "undefined" && args[flag];
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
    var emitError = this.emitError.bind(this);

    var options = getOptions.call(this, compiler.options.mode);
    var files = getFiles.call(this, options);
    var resourcePath = this.resourcePath;

    var maxInstances = options.maxInstances;
    if (typeof maxInstances === "undefined") {
        maxInstances = 1;
    } else if (!Number.isInteger(maxInstances) || maxInstances < 1) {
        throw new Error("maxInstances option must be a positive integer");
    }
    delete options.maxInstances;

    var promises = [];
    var cache = compiler.options.cache;
    var trackDependencies = compiler.watching ||
        (cache && cache.type === "filesystem");

    if (trackDependencies) {
        if (typeof options.cwd !== "undefined" && options.cwd !== null){
            addDependencies(path.join(options.cwd, "elm.json"));
        }

        var dependencies = dependenciesFor(resourcePath, files).then(function(dependencies){
            dependencies.map(addDependencies);
            return { kind: "success", result: true };
        }).catch(function(v){
            emitError(v);
            return { kind: "error", error: v };
        })

        promises.push(dependencies);
    }

    var compilation = compileInQueue(files, options, maxInstances)
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


function compileInQueue(sources, options, maxInstances) {
    return new Promise(function(resolve, reject) {
        compilerQueue.push({
            sources: sources,
            options: options,
            maxInstances: maxInstances,
            resolve: resolve,
            reject: reject
        });
        runCompilerQueue();
    });
}

function runCompilerQueue() {
    while (compilerQueue.length > 0) {
        var next = compilerQueue[0];
        if (runningInstances >= next.maxInstances) return;

        compilerQueue.shift();
        startCompilation(next);
    }
}

function startCompilation(job) {
    runningInstances += 1;
    compile(job.sources, job.options).then(function(result) {
        runningInstances -= 1;
        job.resolve(result);
        runCompilerQueue();
    }, function(error) {
        runningInstances -= 1;
        job.reject(error);
        runCompilerQueue();
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
            options.processOpts = { stdio: ["inherit", "inherit", "pipe"] };

            var compiler;

            try {
                var compilerSources = process.platform === "win32"
                    ? sources.map(function(f) { return '"' + f + '"'; })
                    : sources;
                compiler = elmCompiler.compile(compilerSources, options);
            }
            catch (compileError) {
                return reject(compileError);
            }

            // Catch output from stderr so we can use it in `reject()`
            var errorChunks = [];
            compiler.stderr.on('data', function (data) {
              errorChunks.push(data);
            });

            compiler.on("close", function (exitCode) {
                if (exitCode !== 0) {
                    var errorText = Buffer.concat(errorChunks).toString();
                    return reject("Compilation failed! " + errorText);
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
