#!/usr/bin/env node

/**
 * @module CLI Interface
 * CLI interface to njs tools.  For now just supports transpilation
 */
import {
  bundle as createBundle,
  TRANSPILE_MODES,
  write_outputs,
} from "./transpilation/transpiler.mjs";
// TODO: This is generating a warning.  Either suppress the warning of do this differently
//       before release
import packageJson from "../package.json" assert { type: "json" };
import * as path from "path";
import chalk from "chalk";

const { version } = packageJson;

// For CLI argument/parameter parsing
import { Command, Option } from "commander";
const program = new Command();

// TODO: opt for sourcemaps?  Or maybe just do them by default?
const transpileModeOption = new Option(
  "-t, --transpile [transpileMode]",
  "transpile while bundling"
)
  .choices(Object.keys(TRANSPILE_MODES))
  .preset(TRANSPILE_MODES.DEPENDENCIES)
  .default(TRANSPILE_MODES.NONE);

const outputDirOption = new Option(
  "-o, --output-dir <directory_path>",
  "location to place bundled files"
).default("out/js");

const transformsFileOption = new Option(
  "-f, --transforms-file <filepath>",
  "file containing an array of javascript functions to modify bundled code"
);

// TODO: Either add an option for explicit glob for src files, or automatically assemble the exclude regex based on the
// files passed in, or probably best - both
program
  .name("njs-bundle")
  .usage(
    "filepath(s) [options] \n\n  " +
    chalk.blue("example>") +
    "\n    njs-bundle myfile.mjs anotherfile.mjs -t -c"
  )
  .version(version)
  .argument(
    "<filepaths...>",
    "filepath(s) to bundle seperated by spaces. Ex: 'njs-bundle file1.js file2.js'. Each filepath will be its own bundle"
  )
  .addOption(transpileModeOption)
  .addOption(outputDirOption)
  .addOption(transformsFileOption)
  .showHelpAfterError();

program.parse();

const files = program.args;
console.log("Processing files: ", files);

const { transpile, outputDir, transformsFile, checkCompat } = program.opts();
const transforms = await buildTransformsChain(transformsFile);
const bundle = await doBundleAndTranspile(files, outputDir, { transforms });

await write_outputs(bundle, outputDir);
console.log(`🐳🐳 Bundled files written to ${outputDir} 🐳🐳`);

async function doBundleAndTranspile(
  files,
  outputDir,
  { transforms: transforms }
) {
  const bundles = files.map(async (file) => {
    const [b] = await createBundle(file, {
      transpileMode: transpile,
      outputDir: outputDir,
      transforms: transforms,
    });

    return b;
  });

  return Promise.all(bundles);
}

async function buildTransformsChain(transformsFile) {
  console.log("transforms agiant", transformsFile);
  if (!transformsFile) return [];

  const transformsModule = await import(
    path.join(process.cwd(), transformsFile)
  );

  return transformsModule.default;
}
