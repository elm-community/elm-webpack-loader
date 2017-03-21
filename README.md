# Elm loader [![Version](https://img.shields.io/npm/v/elm-webpack-loader.svg)](https://www.npmjs.com/package/elm-webpack-loader) [![Travis build Status](https://travis-ci.org/elm-community/elm-webpack-loader.svg?branch=master)](http://travis-ci.org/elm-community/elm-webpack-loader) [![AppVeyor build status](https://ci.appveyor.com/api/projects/status/7a5ws36eenwpdvgc/branch/master?svg=true)](https://ci.appveyor.com/project/elm-community/elm-webpack-loader/branch/master)

[Webpack](http://webpack.github.io/docs/) loader for the [Elm](http://elm-lang.org/) programming language.

It is aware of Elm dependencies and tracks them. This means that in `--watch`
mode, if you `require` an Elm module from a Webpack entry point, not only will
that `.elm` file be watched for changes, but any other Elm modules it imports will
be watched for changes as well.

## Installation

```sh
$ npm install --save elm-webpack-loader
```


## Usage

[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html)

In your `webpack.config.js` file:

```js
module.exports = {
  module: {
    loaders: [{
      test: /\.elm$/,
      exclude: [/elm-stuff/, /node_modules/],
      loader: 'elm-webpack'
    }]
  }
};
```

See the [examples](#example) section below for the complete webpack configuration.

### Options

#### cwd (default null) *Recommended*

You can add `cwd=elmSource` to the loader:
```js
var elmSource = __dirname + '/elm/path/in/project'
  ...
  loader: 'elm-webpack?cwd=' + elmSource
  ...
```

You can use this to specify a custom location within your project for your elm files. Note, this
will cause the compiler to look for **all** elm source files in the specified directory. This approach is recommended as it allows the compile to watch elm-package.json as well as every file in the source directories.

#### maxInstances (default 1)

You can add `maxInstances=8` to the loader:

```js
  ...
  loader: 'elm-webpack?maxInstances=8'
  ...
```

Set a limit to the number of maxInstances of elm that can spawned. This should be set to a number less than the number of cores your machine has. The ideal number is 1, as it will prevent Elm instances causing deadlocks. 

#### Cache (default false)

You can add `cache=true` to the loader:

```js
  ...
  loader: 'elm-webpack?cache=true'
  ...
```

If you add this, when using `npm run watch`, the loader will only load the
dependencies at startup. This could be performance improvement, but know that
new files won't be picked up and so won't be watched until you restart webpack.

This flag doesn't matter if you don't use watch mode.

#### ForceWatch (default false)

This loader will infer if you are running webpack in watch mode by checking
the webpack arguments. If you are running webpack programmatically and
wants to force this behaviour you can add `forceWatch=true` to the loader:

```js
  ...
  loader: 'elm-webpack?forceWatch=true'
  ...
```

#### Upstream options

All options are sent down as an `options` object to node-elm-compiler. For example, you can explicitly pick the local `elm-make` binary by setting the option `pathToMake`:

```js
  ...
  loader: 'elm-webpack?pathToMake=node_modules/.bin/elm-make',
  ...
```

For a list all possible options, [consult the source](https://github.com/rtfeldman/node-elm-compiler/blob/3fde73d/index.js#L12-L23).

## Notes

### Example

You can find an example in the `example` folder.
To run:

```
npm install
npm run build
```

You can have webpack watch for changes with: `npm run watch`

You can run the webpack dev server with: `npm run dev`

For a full featured example project that uses elm-webpack-loader see [pmdesgn/elm-webpack-starter](https://github.com/pmdesgn/elm-webpack-starter) .

### noParse

Webpack can complain about precompiled files (files compiled by `elm-make`).
You can silence this warning with [noParse](https://webpack.github.io/docs/configuration.html#module-noparse). You can see it in use in the example.

```js
  module: {
    loaders: [...],
    noParse: [/.elm$/]
  }
```

## Revisions


### 4.3.0

- Set maxInstances to 1
- Patch watching behaviour 

### 4.2.0

Make live reloading work more reliably

### 4.1.0

Added `maxInstances` for limiting of instances

### 4.0.0

Watching is now done based on elm-package.json, faster startup time via @eeue56

### 3.1.0

Add support for `--debug` via `node-elm-compiler`

### 3.0.6

Allow version bumps of node-elm-compiler.

### 3.0.5

Upgrade to latest node-elm-compiler, which fixes some dependency tracking issues.

### 3.0.4

Fix potential race condition between dependency checking and compilation.

### 3.0.3

Use node-elm-compiler 4.0.1+ for important bugfix.

### 3.0.2

Use node-elm-compiler 4.0.0+

### 3.0.1

Pass a real error object to webpack on failures.

### 3.0.0

Support Elm 0.17, and remove obsolete `appendExport` option.

### 2.0.0

Change `warn` to be a pass-through compiler flag rather than a way to specify
logging behavior.

### 1.0.0

Initial stable release.
