# njs Tooling

This repository represents a set of tools for working with njs scripts for nginx.

The goal is an allow speed of development while also making it easy to develop scripts that are production ready.

## Philosophy

Develop a set of well documented modules that give developers the tools to do the right thing easily when writing njs scripts, but allows an escape to full tunability.

Each function should be able to operate in isolation
Eventually, the modules together should form a kind of development framework for njs.

Basic functionality should be usable via a CLI tool that is made available upon installing the package, but the CLI does not need to support full advanced functionality.

## ROADMAP

- Add writing of sourcemaps + tooling to view sourcemaps
- Add functionality to check bundled code or arbitrary code for njs compatibility issues:
    - Scan for known incompatible regexs OR actually test them against PCRE2
    - Research and implement checks for astral code points
    - Add checks for ES apis that don't exist in njs
    - Make the reporter note incomplete implementations
- try to do a PR/get in touch with the maintainer of `babel-preset-njs`
- Add a code generator for a new project ala `mix` or `cargo`
- Add a command to generate a release bundle
- Support typescript
- Add a testing api for njs unit tests run in the njs runtime
- Add a testing api for njs integration tests
- Add a dev workflow command (watch, rebundle, reload nginx, etc)

## CLI
You can view usage instructions for the CLI tool by running `npx njs-bundle --help`.  You can also reference the below documentation on specific features.

## Transpilation
Transpiliation can be performed while bundling by adding the `-t` or `--transpile` flag to the cli command:
```
npx njs-bundle --transpile
```

The transpiler is configured using the `babel-preset-njs` library which is tuned to only transpile code that is not compatible with njs.  Even so *you should aim to transpile as little as possible, or ideally not at all* since it adds complexity to both build, maintenance, and debugging.

### Modes
Transpilation is performed in three different modes:
* `NONE` - Nothing is transpiled
* `SCOPED` (default) - The tool attempts to only transpile code that you did not write.  By default, it assumes that your njs source code is at `**/src/**/*.?(m)js`.  However, you can also pass a glob to specify the pattern to skip transpilation by passing the `-i` or `--transpile-ignore` flag. See the next subsection for more details.
* `ALL` - All code will be run through the transpiler

### Scoping Transpilation
When operating in `SCOPED` mode (which is the default if the `--transpile` flag is passed) you can additionally pass the `-i` or `--transpile-ignore` flag.

This flag takes a single "glob" type argument that specifies the pattern that should be used when *skipping* transpilation.  For example, if I know that I will be writing my njs scripts using only njs-compatible syntax and I keep them in `/code/scripts` then I could specify:

```
npx njs-bundle -t SCOPED -i '/code/scripts/*.?(m)js'`
```

By default, the tool assumes anything in `**/src/**/*.?(m)js` should not be transpiled - so if you don't want to have to configure this every time just put your njs scripts under a `src` directory.



