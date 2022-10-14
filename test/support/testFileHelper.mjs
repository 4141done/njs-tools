/**
 * @module testFileHelper
 * This code is a bit of a hack and has the following effects on tests:
 * 1. They cannot be run in parallel
 * 2. They will not be super fast
 *
 * However, given the fact that we are testing code that tests a babel transpilation,
 * using jest mocks and libraries like `memfs` and `mockfs` proved to be extremely
 * complex when coupled with the fact that this project uses ESM for imports and support
 * is still experimental.  If you have a better way to do this, let's talk <3
 */

import fs from "fs/promises";
import path from "path";

const TEST_FILES_DIR = "./test/support/tmp";

/**
 * Provides a file or directory path that is in the test directory
 * @example
 * testPath("main.mjs");
 * @param {string} relativeFilepath - some file path
 */
export function testPath(relativeFilepath) {
  return path.join(TEST_FILES_DIR, relativeFilepath);
}

/**
 * Makes sure the test file tmp directory exists and is empty.
 * Should be run before and after tests if you want to keep things clean.
 */
export async function restoreTestDir() {
  await fs.mkdir(TEST_FILES_DIR, { recursive: true });
  for (const item of await fs.readdir(TEST_FILES_DIR)) {
    const itemPath = path.join(TEST_FILES_DIR, item);
    const stat = await fs.stat(itemPath);

    if (stat.isDirectory()) {
      await fs.rm(itemPath, { recursive: true });
    } else {
      await fs.unlink(itemPath);
    }
  }
}
