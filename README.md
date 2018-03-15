# Elm loader [![Version](https://img.shields.io/npm/v/elm-webpack-loader.svg)](https://www.npmjs.com/package/elm-webpack-loader) [![Travis build Status](https://travis-ci.org/elm-community/elm-webpack-loader.svg?branch=master)](http://travis-ci.org/elm-community/elm-webpack-loader) [![AppVeyor build status](https://ci.appveyor.com/api/projects/status/7a5ws36eenwpdvgc/branch/master?svg=true)](https://ci.appveyor.com/project/elm-community/elm-webpack-loader/branch/master)

[Webpack](https://webpack.js.org/) loader for the [Elm](http://elm-lang.org/) programming language.

It is aware of Elm dependencies and tracks them. This means that in `--watch`
mode, if you `require` an Elm module from a Webpack entry point, not only will
that `.elm` file be watched for changes, but any other Elm modules it imports will
be watched for changes as well.

## Installation

```sh
$ npm install --save elm-webpack-loader
```


## Usage

#### Webpack 2

Documentation: [rules](https://webpack.js.org/configuration/module/#rule)

`webpack.config.js`:

```js
module.exports = {
  module: {
    rules: [{
      test: /\.elm$/,
      exclude: [/elm-stuff/, /node_modules/],
      use: {
        loader: 'elm-webpack-loader',
        options: {}
      }
    }]
  }
};
```

#### Webpack 1

Documentation: [loaders](http://webpack.github.io/docs/using-loaders.html)

`webpack.config.js`:

```js
module.exports = {
  module: {
    rules: [{
      test: /\.elm$/,
      exclude: [/elm-stuff/, /node_modules/],
      use: 'elm-webpack-loader'
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
  use: {
    loader: 'elm-webpack-loader',
    options: {
      cwd: elmSource
    }
  }
  ...
```

`cwd` should be set to the same directory as your `elm-package.json` file. You can use this to specify a custom location within your project for your elm files. Note, this
will cause the compiler to look for **all** elm source files in the specified directory. This
approach is recommended as it allows the compile to watch elm-package.json as well as every file
in the source directories.

#### maxInstances (default 1)

You can add `maxInstances=8` to the loader:

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      maxInstances: 8
    }
  }
  ...
```

Set a limit to the number of maxInstances of elm that can spawned. This should be set to a number
less than the number of cores your machine has. The ideal number is 1, as it will prevent Elm
instances causing deadlocks.

#### Cache (default false)

You can add `cache=true` to the loader:

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      cache: true
    }
  }
  ...
```

If you add this, when using `npm run watch`, the loader will only load the dependencies at startup.
This could be performance improvement, but know that new files won't be picked up and so won't be
watched until you restart webpack.

This flag doesn't matter if you don't use watch mode.

#### ForceWatch (default false)

This loader will infer if you are running webpack in watch mode by checking the webpack arguments.
If you are running webpack programmatically and wants to force this behaviour you can add
`forceWatch=true` to the loader:

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      forceWatch: true
    }
  }
  ...
```

#### RuntimeOptions (default `undefined`)

This allows you to control aspects of how `elm-make` runs with [GHC Runtime Options](https://downloads.haskell.org/~ghc/7.10.1/docs/html/users_guide/runtime-control.html).

The 0.18 version of `elm-make` supports a limited set of those options, the most useful of which is
for profiling a build.  To profile a build use the settings `runtimeOptions: '-s'`, which will print
out information on how much time is spent in mutations, in the garbage collector, etc.

_Note_: Using the flags below requires building a new `elm-make` binary with `-rtsopts` enabled!

If you notice your build spending a lot of time in the garbage collector, you can likely optimize it
with some additional flags to give it more memory, `e.g. -A128M -H128M -n8m`.

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      runtimeOptions: '-A128M -H128M -n8m'
    }
  }
  ...
```

#### Files (default - path to 'required' file)

elm-make allows you to specify multiple modules to be combined into a single bundle

```
elm-make Main.elm Path/To/OtherModule.elm --output=combined.js
```

The `files` option allows you to do the same within webpack

```
module: {
  loaders: [
    {
      test: /\.elm$/,
      exclude: [/elm-stuff/, /node_modules/],
      loader: "elm-webpack",
      options: {
        files: [
          path.resolve(__dirname, "path/to/Main.elm"),
          path.resolve(__dirname, "Path/To/OtherModule.elm")
        ]
      }
    }
  ]
}
```
(Note: It's only possible to pass array options when using the object style of loader configuration.)

You're then able to use this with

```
import Elm from "./elm/Main";

Elm.Main.embed(document.getElementById("main"));
Elm.Path.To.OtherModule.embed(document.getElementById("other"));
```

##### Modules with elm-hot

Because you must use the object style configuration it isn't possible to use the chained loader syntax (`loader:  'elm-hot!elm-webpack'`). Instead you may use [`webpack-combine-loaders`](https://www.npmjs.com/package/webpack-combine-loaders)

```
var combineLoaders = require("webpack-combine-loaders");

module: {
  loaders: [
    {
      test: /\.elm$/,
      exclude: [/elm-stuff/, /node_modules/],
      loader: combineLoaders([
        {
          loader: "elm-hot"
        },
        {
          loader: "elm-webpack",
          options: {
            files: [
              path.resolve(__dirname, "path/to/Main.elm"),
              path.resolve(__dirname, "Path/To/OtherModule.elm")
            ]
          }
        }
      ])
    }
  ]
}
```

#### Upstream options

All options are sent down as an `options` object to node-elm-compiler. For example, you can
explicitly pick the local `elm-make` binary by setting the option `pathToMake`:

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      pathToMake: 'node_modules/.bin/elm-make'
    }
  }
  ...
```

For a list all possible options,
[consult the source](https://github.com/rtfeldman/node-elm-compiler/blob/3fde73d/index.js#L12-L23).

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
You can silence this warning with
[noParse](https://webpack.github.io/docs/configuration.html#module-noparse). You can see it in use
in the example.

```js
  module: {
    rules: [...],
    noParse: [/.elm$/]
  }
```

## Revisions

### 4.5.0

- Support for Webpack 3+
- Upgrade node-elm-compiler to 4.5.0+

### 4.4.0

- Support for Webpack 2+
- Support for multiple main modules
- Support for `--watch-stdin`
- Add an example for Webpack 2+

### 4.3.1

- Fix a bug where maxInstances might end up being higher than expected

### 4.3.0

- Set maxInstances to 1
- Patch watching behaviour
- Add `forceWatch` to force watch mode

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
