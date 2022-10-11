import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-node-polyfills";
import { babel } from "@rollup/plugin-babel";
import * as fs from "fs/promises";
import * as path from "path";

// The below is necessary because `__filename`
// and `__dirname` are not available in .mjs context
import { dirname, filename } from '../common.mjs';
const [__dirname, __filename] = [dirname(), filename()];


// https://blog.openreplay.com/the-ultimate-guide-to-getting-started-with-the-rollup-js-javascript-bundler

/**
 * @module Transpiler
 */

/**
 * Enum for transpilation modes
 * @readonly
 * @enum {String}
 */
const TRANSPILE_MODES = {
  /** Script files will not be transpiled */
  NONE: "NONE",
  /**  Only node dependencies are transpiled.  This is the default */
  DEPENDENCIES: "DEPENDENCIES",
  /** All files are transpiled except polyfills */
  ALL: "ALL",
};

const USER_SCRIPTS_GLOB = "./*";
const POLYFILLS_REGEX = /\/core-js\//;

const BASE_ROLLUP_INPUT_OPTIONS = {
  // Place things provided by njs here that may clash with
  // node or basic js globals
  external: ["querystring", "fs"],
  plugins: [
    // MUST be before babel.  Makes sure all external code is brought in using ES Modules rather than commonjs
    commonjs(),
    // Automatically provide implementations for node APIs.  This should be configured
    nodePolyfills(),
    // Clue rollup on where to find dependencies
    nodeResolve(),
  ],
};

/**
 * Responsible for consuming and preparing the rollup input and output options
 * and supplying defaults
 * @example
 * bundle('foo.mjs', { transpileMode: 'ALL', outputDir: 'out/js', appendPlugins: [] })
 * @param {string|Array|Object} input - input files or folders as described in the {@link https://rollupjs.org/guide/en/#inputrollup docs}
 * @param {Object} options - options for the bundle
 * @param {Array}  options.appendPlugins - An array of rollup plugins. These plugins will be added AFTER the base set of plugins for the transpile which are [@rollup/plugin-commonjs, rollup-plugin-node-polyfills, @rollup/plugin-node-resolve, @rollup/plugin-babel (if transpiling)]
 * @param {Array}  options.outputDir - The path of the directory to put the js bundles
 * @param {('NONE'|'DEPENDENCIES'|'ALL')} options.transpileMode - An enum from `TRANSPILE_MODES` (default `'DEPENDENCIES'`)
 * @returns {Promise} Promise object has an array with the final bundled code
 */
async function bundle(input, options = {}) {
  console.log(`Bundling ${input} with options: `, options);
  const appendPlugins = options.appendPlugins || [];
  const transpileMode = options.transpileMode || TRANSPILE_MODES.DEPENDENCIES;
  const outputDir = options.outputDir || "_build";
  const transforms = options.transforms || [];

  const babelPlugin = configureBabelForTranspileMode(transpileMode);
  const inputPlugins = BASE_ROLLUP_INPUT_OPTIONS.plugins
    .concat(babelPlugin ? [babelPlugin] : [])
    .concat(appendPlugins);

  const inputOptions = Object.assign({}, BASE_ROLLUP_INPUT_OPTIONS, {
    input: input,
    plugins: inputPlugins,
  });

  const outputOptions = {
    dir: outputDir,
    sourcemap: true,
  };

  return build(inputOptions, outputOptions, transforms);
}

/**
 * Modify the rollup plugins array to include the correct
 * babel plugin configuration for the chosen transpilation mode.
 * @private
 * @param {Array}  plugins - An array of rollup plugins.
 * @param {('NONE'|'DEPENDENCIES'|'ALL')} transpileMode - An enum from `TRANSPILE_MODES` (default `'DEPENDENCIES'`)
 * @returns {Array} An array of rollup plugins.
 */
function configureBabelForTranspileMode(transpileMode, files) {
  let babelPluginWithConfig;
  const defaultConfig = {
    babelHelpers: "bundled",
    exclude: [USER_SCRIPTS_GLOB, POLYFILLS_REGEX],
    configFile: path.resolve(__dirname, "transpilation/babel.config.json"),
  };

  if (transpileMode === TRANSPILE_MODES.DEPENDENCIES) {
    babelPluginWithConfig = babel(defaultConfig);
  } else if (transpileMode === TRANSPILE_MODES.NONE) {
    babelPluginWithConfig = null;
  } else if (transpileMode === TRANSPILE_MODES.ALL) {
    babelPluginWithConfig = babel(
      Object.assign({ exclude: [POLYFILLS_REGEX] }, defaultConfig)
    );
  } else {
    throw `Unknown transpile mode ${transpileMode}`;
  }

  return babelPluginWithConfig;
}

/**
 * Perform the actual build and bundling of files. This is a fairly vanilla implementation of rollup.
 * and the official docs can be used as a reference.
 * @private
 * @param {Object}  inputOptions - The input options as expected by [rollup input]{@link https://rollupjs.org/guide/en/#input}
 * @param {Object} outputOptions - The output options as expected by [rollup output]{@link https://rollupjs.org/guide/en/#outputdir}
 * @returns {Promise} Promise object has an array with the final bundled code */
async function build(inputOptions, outputOptions, transforms) {
  try {
    const bundle = await rollup(inputOptions);

    const { output } = await bundle.generate(outputOptions);

    // The transforms operate on a Rollup chunk.
    // you can see what fields are availabble in 'chunk'
    // here: https://rollupjs.org/guide/en/#rolluprollup
    // Each transform should return just the modified source code.
    // Modifying the chunk will not do anything as the chunk
    // is a copy of the original chunk provided for reference
    const transformChain = transforms.concat([
      (code, chunk) => {
        if (chunk.exports.includes("default")) {
          return code.replace(
            /export \{ (.+) as default \};/,
            "export default $1;"
          );
        }

        return code;
      },
    ]);

    const finalOutput = output.map((chunk) => {
      // Use a copied version so that transforms don't mess with the chunk itself
      const chunkCopy = Object.assign({}, chunk);
      const modifiedCode = transformChain.reduce(
        (code, fn) => fn(code, chunkCopy),
        chunkCopy.code
      );

      // check on filename and contains
      // let modifiedCode = chunk.code;
      // if (chunk.code.includes('function slug(')) {
      //   modifiedCode = modifiedCode.replace('function slug(', 'function slugFn(');
      // }
      // if (chunk.exports.includes("default")) {
      //   modifiedCode = modifiedCode.replace(
      //     /export \{ (.+) as default \};/,
      //     "export default $1;"
      //   );
      // }

      return Object.assign(chunk, {
        code: modifiedCode,
      });
    });

    await bundle.close();
    return Promise.resolve(finalOutput);
  } catch (error) {
    console.log(error);
    return Promise.reject(error);
  }
}

/**
 * After the bundle is created, write the output to files
 * @param {Object} bundle - The output options as expected by [rollup output]{@link https://rollupjs.org/guide/en/#outputdir}
 * @returns {number} An array of rollup plugins.
 */
async function write_outputs(output, folder = "_build") {
  await fs.mkdir(folder, { recursive: true });

  for (const bundle of output) {
    const destFile = path.join(folder, bundle.fileName);
    await fs.writeFile(destFile, bundle.code);
  }
}

export { bundle, TRANSPILE_MODES, write_outputs };
