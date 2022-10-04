# njs Tooling

This repository represents a set of tools for working with njs scripts for nginx.
The goal is an allow speed of development while also making it easy to develop scripts that are production ready.

## Philosophy

Develop a set of well documented modules that give developers the tools to do the right thing easily when writing njs scripts, but allows an escape to full tunability.

Each function should be able to operate in isolation
Eventually, the modules together should form a kind of development framework for njs.

Pending modules

- Testing (specifically, unit testing njs using the njs runtime)
- Configuration and code structure
- Packaging of njs modules for distribution
- Generation of new njs projects

## TODO:

- Add writing of sourcemaps + tooling to view sourcemaps
- Use command to make testing for transpilation needed a separate command
- [stretch] Scan for known incompatible regexs OR actually test them against PCRE2
- Research and implement checks for astral code points
- Add checks for ES apis that don't exist in njs
- Make the reporter note incomplete implementations
- try to do a PR/get in touch with the maintainer of `babel-preset-njs`

## Transpilation

### Usage

#### CLI

You can transpile a certain root file or folder by passing it to the script
`npx njs-bundle index.js`

You may also give a folder, in that case, all transpiled files will be written to the output directory
By default, your script will _not_ be transpiled, but any dependencies will be.

If you would like all involved files to be transpiled, specify the mode:
`npx njs-bundle index.js -t ALL`

Mainly, doing this will give you the ability to:

- Add other rollup plugins
- Specify additional files to exclude from transpilation
- Specify code patterns that should be replaced
