#!/usr/bin/env node

/**
 * @module CLI Interface
 * CLI interface to njs tools.  For now just supports transpilation
 */
import {
  bundle as createBundle,
  TRANSPILE_MODES,
  write_outputs,
} from "./transpiler.mjs";
import { genCompatibilityReport } from "./njs-compatibility.mjs";

import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";

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

const compatibilityCheckOption = new Option(
  "-c, --check-compat",
  "generates an advisory compatibility report for the code in given <filepath> with the njs engine"
);

program
  .name("njs-bundle")
  .usage(
    "filepath(s) [options] \n\n  " +
      chalk.blue("example>") +
      "\n    njs-bundle myfile.mjs anotherfile.mjs -t -c"
  )
  .addOption(transpileModeOption)
  .addOption(outputDirOption)
  .addOption(transformsFileOption)
  .addOption(compatibilityCheckOption);

program.parse();

const files = program.args;
console.log("Processing files: ", files);
// TODO: Commander should allow me to require at least one arg?
if (files.length === 0)
  throw "must specify at least one file.  Run --help for details";

const { transpile, outputDir, transformsFile, checkCompat } = program.opts();

const transforms = await buildTransformsChain(transformsFile);
const bundle = await doBundleAndTranspile(files, outputDir, transforms);

if (checkCompat) {
  for (let chunk of bundle) {
    console.log(chunk.facadeModuleId);
    genCompatibilityReport(chunk.code, chunk.facadeModuleId);
  }
}

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
  if (!transformsFile) return [];

  const transformsModule = await import(
    path.join(process.cwd(), transformsFile)
  );

  return transformsModule.default;
}
