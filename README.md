# Elm loader [![Version](https://img.shields.io/npm/v/elm-webpack-loader.svg)](https://www.npmjs.com/package/elm-webpack-loader) [![Travis build Status](https://travis-ci.org/rtfeldman/elm-webpack-loader.svg?branch=master)](http://travis-ci.org/rtfeldman/elm-webpack-loader) [![AppVeyor build status](https://ci.appveyor.com/api/projects/status/7a5ws36eenwpdvgc/branch/master?svg=true)](https://ci.appveyor.com/project/rtfeldman/elm-webpack-loader/branch/master)

Webpack loader for the [Elm](http://elm-lang.org/) programming language.


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

### Options

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

## Notes

### Example

You can find an example in the `example` folder.
To run:

```
npm install
npm run build
```

or run with `npm run watch` to use `webpack --watch`.

### noParse

Webpack can complain about precompiled files (files compiled by `elm-make`).
You can silence this warning with (noParse)[https://webpack.github.io/docs/configuration.html#module-noparse]. You can see it in use in the example.

```js
  module: {
    loaders: [...],
    noParse: [/.elm$/]
  }
```
