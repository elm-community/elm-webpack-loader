# Changelog

## 8.0.3

- Serialize Elm compilations to prevent `elm-stuff` cache corruption, cold-cache first-build races, and Windows memory exhaustion during parallel webpack builds.
- Declare `temp` as a direct dependency instead of relying on other packages to provide it.
- Track Elm file dependencies in watch mode and with webpack filesystem caching so changes, including `exposing`-list edits, invalidate stale output.
- Avoid rebuilding unrelated Elm modules in watch mode.
- Use webpack's native loader-options API when available, with a `loader-utils` fallback for older webpack versions.
- Require `loader-utils` 2.0.4 and `node-elm-compiler` 5.0.6 or later, including the `loader-utils` prototype-pollution fix.
- Correct the multiple-entry example to use Elm 0.19's named export and explicit `.elm` import.

## 8.0.2

- Fix Elm compilation on Windows when source paths contain spaces or dashes.
- Refresh the README with a feature overview, quick start, and modern alternatives for new projects.
- Move the release history to a dedicated changelog.

## 8.0.1

- Include Elm compiler diagnostics in webpack compilation errors.
- Support Elm 0.19.2 and 0.19.3, and make Elm an optional dependency instead of a peer dependency.

## 8.0.0

- Fix watching when using the dev server. Use `compiler.watching` instead of `compiler.options.watch` as the latter doesn't work with the dev server.

## 7.0.0

- Logs build output directly to stdout to retain formatting.
- Remove stack trace for errors, as they're never relevant.
- `optimize` and `debug` flags are now set by default depending on the webpack mode.
- Removed several options which provide little benefit.
- Reduced number of dependencies.

## 6.0.0

- Elm is now a peer dependency.
- Documentation fixes.

## 5.0.0

- Support for Elm 0.19, drops support for Elm 0.18.

## 4.3.1

- Fix a bug where maxInstances might end up being higher than expected

## 4.3.0

- Set maxInstances to 1
- Patch watching behaviour
- Add `forceWatch` to force watch mode

## 4.2.0

Make live reloading work more reliably

## 4.1.0

Added `maxInstances` for limiting of instances

## 4.0.0

Watching is now done based on elm-package.json, faster startup time via @eeue56

## 3.1.0

Add support for `--debug` via `node-elm-compiler`

## 3.0.6

Allow version bumps of node-elm-compiler.

## 3.0.5

Upgrade to latest node-elm-compiler, which fixes some dependency tracking issues.

## 3.0.4

Fix potential race condition between dependency checking and compilation.

## 3.0.3

Use node-elm-compiler 4.0.1+ for important bugfix.

## 3.0.2

Use node-elm-compiler 4.0.0+

## 3.0.1

Pass a real error object to webpack on failures.

## 3.0.0

Support Elm 0.17, and remove obsolete `appendExport` option.

## 2.0.0

Change `warn` to be a pass-through compiler flag rather than a way to specify
logging behavior.

## 1.0.0

Initial stable release.
