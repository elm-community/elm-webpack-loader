# Elm webpack loader

[![npm version](https://img.shields.io/npm/v/elm-webpack-loader.svg?style=for-the-badge)](https://www.npmjs.com/package/elm-webpack-loader) [![Matrix](https://img.shields.io/matrix/elm-dev%3Amatrix.org?style=for-the-badge)](https://matrix.to/#/#elm-dev:matrix.org)
[![build status](https://img.shields.io/travis/com/elm-community/elm-webpack-loader?branch=master&style=for-the-badge)](https://app.travis-ci.com/elm-community/elm-webpack-loader)
[![license](https://img.shields.io/npm/l/elm-webpack-loader.svg?style=for-the-badge)](https://github.com/elm-community/elm-webpack-loader/blob/master/LICENSE)

> Compile [Elm](https://elm-lang.org/) applications with [webpack](https://webpack.js.org/).

- 🔍 **Dependency-aware watch mode** rebuilds when imported Elm modules change.
- ⚙️ **Sensible defaults** enable the debugger in development and optimizations in production.
- 🔥 **Hot module reloading** works with `elm-hot-webpack-loader`.
- 🩺 **Compiler diagnostics** appear directly in webpack's error output.

> ## **ℹ️ NOTE:** For new projects, consider a modern alternative
>
> - **Pure Elm:** [elm-watch](https://lydell.github.io/elm-watch/)
> - **Mixed language/framework projects:** [vite-plugin-elm-watch](https://github.com/ryannhg/vite-plugin-elm-watch) or [vite-plugin-elm](https://github.com/hmsk/vite-plugin-elm)

Elm webpack loader connects the Elm compiler to webpack. It tracks Elm module imports, so watch mode rebuilds your application when any imported module changes—not just when the entry module changes.

## Quick start

Install the loader:

```sh
npm install --save-dev elm-webpack-loader
```

Node.js 22.15 or later is required.

Add it to your [webpack module rules](https://webpack.js.org/configuration/module/#rule):

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

Add an element for Elm to replace:

```html
<div id="main"></div>
```

Import your Elm module and initialize the application:

```js
const { Elm } = require('./Main.elm');

Elm.Main.init({
  node: document.getElementById('main')
});
```

For a `Browser.element` program, `node` replaces only that element, leaving the rest of `<body>` under your control; you do not need to modify the generated JavaScript. `Browser.document` and `Browser.application` intentionally manage the entire body instead.

See the [example](#example) for a complete project or configure the [loader options](#options) below.

## Options

### cwd (default null) _Recommended_

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

`cwd` should be set to the same directory as your `elm.json` file. You can use this to specify a custom location within your project for your elm files. Note, this
will cause the compiler to look for **all** elm source files in the specified directory. This
approach is recommended as it allows the compile to watch elm.json as well as every file
in the source directories.

### Optimize (default is `true` in production mode)

Set this to `true` to compile bundle in optimized mode. See <https://elm-lang.org/0.19.3/optimize> for more information.

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      optimize: true
    }
  }
  ...
```

### Debug (default is true in development mode)

Set this to true to enable Elm's time traveling debugger.

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      debug: true
    }
  }
  ...
```

### RuntimeOptions (default `undefined`)

This allows you to control aspects of how `elm make` runs with [GHC Runtime Options](https://downloads.haskell.org/~ghc/latest/docs/html/users_guide/runtime_control.html).

The 0.19 version of `elm make` supports a limited set of those options, the most useful of which is
for profiling a build.  To profile a build use the settings `runtimeOptions: '-s'`, which will print
out information on how much time is spent in mutations, in the garbage collector, etc.

_Note_: Using the flags below requires building a new `elm make` binary with `-rtsopts` enabled!

If you notice your build spending a lot of time in the garbage collector, you can likely optimize it
with some additional flags to give it more memory, `e.g. -A128M -H128M -n8m`.

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      runtimeOptions: ['-A128M', '-H128M', '-n8m']
    }
  }
  ...
```

### Files (default - path to 'required' file)

elm make allows you to specify multiple modules to be combined into a single bundle

```sh
elm make Main.elm Path/To/OtherModule.elm --output=combined.js
```

The `files` option allows you to do the same within webpack

```js
module: {
  loaders: [
    {
      test: /\.elm$/,
      exclude: [/elm-stuff/, /node_modules/],
      loader: 'elm-webpack-loader',
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

```js
import { Elm } from "./elm/Main.elm";

Elm.Main.init({node: document.getElementById("main")});
Elm.Path.To.OtherModule.init({node: document.getElementById("other")});
```

### maxInstances (default `1`)

Set the maximum number of Elm compiler processes that can run concurrently:

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      maxInstances: 2
    }
  }
  ...
```

The value must be a positive integer. The default of `1` prevents concurrent writes to Elm's shared `elm-stuff` cache and limits memory use. Only increase it when your projects and working directories support parallel compilation; higher limits can substantially increase memory consumption.

### Upstream options

All options are sent down as an `options` object to node-elm-compiler. For example, you can
explicitly pick the local `elm` binary by setting the option `pathToElm`:

```js
  ...
  use: {
    loader: 'elm-webpack-loader',
    options: {
      pathToElm: 'node_modules/.bin/elm'
    }
  }
  ...
```

For a list all possible options,
[consult the source](https://github.com/rtfeldman/node-elm-compiler/blob/3fde73d/index.js#L12-L23).

## Hot module reloading

Hot module reloading is supported by installing [elm-hot-webpack-loader](https://github.com/klazuka/elm-hot-webpack-loader)
and adding it to your list of loaders. It should look something like this:

```js
module: {
  rules: [
    {
      test: /\.elm$/,
      exclude: [/elm-stuff/, /node_modules/],
      use: [
        { loader: 'elm-hot-webpack-loader' },
        { loader: 'elm-webpack-loader' }
      ]
    }
  ]
}
```

**IMPORTANT**: `elm-hot-webpack-loader` must be placed in the list immediately _before_ `elm-webpack-loader`.

## Example

You can find an example in the `example` folder.
To run:

```sh
npm install
npm run build
```

You can have webpack watch for changes with: `npm run watch`

You can run the webpack dev server with: `npm run dev`

For a full featured example project that uses elm-webpack-loader see [pmdesgn/elm-webpack-starter](https://github.com/pmdesgn/elm-webpack-starter) .

## noParse

Webpack can complain about precompiled files (files compiled by `elm make`).
You can silence this warning with
[noParse](https://webpack.github.io/docs/configuration.html#module-noparse). You can see it in use
in the example.

```js
  module: {
    rules: [...],
    noParse: [/.elm$/]
  }
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the release history.

## ❤️ Projects we love

Unaffiliated projects worth exploring:

- 🌳 **Elm family**: [Awesome Elm](https://github.com/sporto/awesome-elm) — a community-curated
  collection of Elm tutorials, libraries, tools, examples, and community resources.

  _also [Elm companies](https://github.com/jah2488/elm-companies) and the
  [#elm-dev Matrix space](https://matrix.to/#/#elm-dev:matrix.org) for team chat_
- 🗄️ **Databases**: [Acadia](https://acadia.engineering/) — precise types, verified migrations, and
  compile-time-checked database programming for Elm, with the goal of sustainably funding Elm
  development.

  _also [mnestic](https://www.mnesticdb.com/) — an embedded Datalog database combining graph traversal,
  vector and keyword search, and historical queries._
- ⌨️ **Editors**: [Lapce](https://lap.dev/lapce/) — a fast, native Rust editor with GPU acceleration,
  built-in LSP and Tree-sitter support, remote development, and efficient [rope-based text storage](https://xi-editor.io/docs/rope_science_00.html).

  _also [Helix](https://helix-editor.com/) — a terminal-based modal editor with [Kakoune-inspired
  multiple selections](https://kakoune.org/why-kakoune/why-kakoune.html), Tree-sitter integration,
  and built-in language-server support._
- 🔄 **Version-controlled data and file sync**: [git-annex](https://git-annex.branchable.com/) —
  manage and sync large files with Git without storing their contents in Git, including location
  tracking, checksums, and encryption.

  _also [DataLad](https://www.datalad.org/) — distributed data management built on Git and
  `git-annex`, with provenance tracking, reproducibility, and nested datasets._
- 🧩 **Local-first sync**: [Automerge](https://automerge.org/) — a network-agnostic CRDT library for
  offline editing, automatic merging of concurrent changes, and version history, with
  [Peritext](https://www.inkandswitch.com/peritext/) providing a collaborative rich-text data type.
- 🗒️ **Local-first notes**: [SiYuan](https://b3log.org/siyuan/en/) — privacy-first, block-based notes
  with bidirectional links, databases, Markdown support, and end-to-end encrypted multi-device sync.

  _also [TypeCell](https://www.typecell.org/) — local-first, programmable documents with interactive
  code blocks, a live TypeScript/React runtime, and Peritext-based rich-text collaboration._
- 🔀 **Distributed version control**: [Pijul](https://pijul.org/) — a patch-based system built on a
  mathematical theory of change commutation, with first-class conflicts and partial clones.
- 🧮 **Programming languages**: [Unison](https://www.unison-lang.org/) — a functional language that
  identifies definitions by content hash, with structured refactoring, type-based search, durable
  storage, and distributed computation.

  _also [Idris](https://idris-lang.org/) — a dependently typed language for
  [type-driven development](https://kevinmahoney.co.uk/articles/tests-vs-types/), with first-class
  types, compiler-checked program properties, and a self-hosted compiler._
- 🌐 **Internet architecture**: [Named Data Networking (NDN)](https://named-data.net/) — a
  [data-centric network architecture](https://101.named-data.net/) that names and secures data
  directly, with stateful forwarding and in-network caching.
- 📚 **Knowledge bases**: [Ownly](https://ownly.work/) — decentralized collaborative workspaces built
  on Named Data Networking, with signed and encrypted updates and local copies of shared files.

  _also [AppFlowy](https://appflowy.com/) — a self-hosted workspace for projects, wikis, documents,
  and databases, with cross-device sync and control over your infrastructure and data._
- 🗣️ **Internationalization (i18n)**: [Fluent](https://projectfluent.org/) — a proper localization
  system by [Mozilla and used by others](https://github.com/heyakyra/fluent-companies) letting
  translators use each language's full grammar, with asymmetric translations, plural and
  grammatical-case handling, and reusable terms.
- 🎨 **UX and vector design**: [Penpot](https://penpot.app/) — an open-source, web-based design and
  prototyping platform with real-time collaboration, reusable components, CSS Grid and Flex layouts,
  native SVG, and self-hosting.

## Acknowledgements

Maintenance and documentation used AI assistance from [Qwen.ai](https://qwen.ai/) and [Kimi.ai](https://www.kimi.ai/).
