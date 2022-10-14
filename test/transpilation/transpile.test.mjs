// The below are necessary since we are using ES6
// modules and both `jest` and `mock-fs` have limited support
import { jest } from "@jest/globals";
import fs from "fs/promises";
import { testPath, restoreTestDir } from "../support/testFileHelper.mjs";

import {
  bundle,
  TRANSPILE_MODES,
  write_outputs,
} from "../../src/transpilation/transpiler.mjs";

describe("bundle", () => {
  const originalWarn = console.warn.bind(console.warn);
  beforeAll(() => {
    // This is necessary since the node module we use for testing produces a circular dependency warning
    // which is not relevant to the test.
    console.warn = (msg) =>
      !msg.toString().includes("semver") && originalWarn(msg);
  });

  beforeEach(async () => {
    await restoreTestDir();
  });

  afterEach(async () => {
    // await restoreTestDir();
  });

  afterAll(() => {
    console.warn = originalWarn;
  });

  test("produces the default export required by njs", async () => {
    fs.writeFile(
      testPath("main.mjs"),
      `
        import fooLib from './foo.mjs';

        function bar() {
          const a = fooLib.foo();

          return a + 3;
        }

        export default { bar };
      `
    );

    fs.writeFile(
      testPath("foo.mjs"),
      `
        function foo() {
          return 4;
        }

        export default { foo };
      `
    );

    const [{ code }] = await bundle(testPath("main.mjs"), {
      transpileMode: "NONE",
    });

    expect(code).toContain("export default main");
  });

  test("when transpiling only dependencies, it leaves source files in the default directory untranspiled, but transpiles node modules", async () => {
    await fs.mkdir(testPath("./src"));
    await fs.writeFile(
      testPath("./src/main.mjs"),
      `
        import { valid } from "semver";
        const [a] = [valid('1.2.3')];
        
        export default { a };
        `
    );

    const [{ code }] = await bundle(testPath("./src/main.mjs"), {
      transpileMode: TRANSPILE_MODES.SCOPED,
    });

    // The below is `const opts = ['includePrerelease'` in the original file.
    // We will need to change this once we update the preset not to transpile block-scoped vars
    expect(code).toContain("var opts = ['includePrerelease'");

    // destructuring is not supported by njs and the preset would transpile it out
    expect(code).toContain("const [a] = [");
  });

  test("when transpiling only dependencies, it respects the ignore glob by leaving local files specified in glob", async () => {
    await fs.writeFile(
      testPath("main.mjs"),
      `
        import fooLib from './foo.mjs';

        function bar() {
          // destructuring would be transpiled out
          const [a] = [fooLib.foo()];

          return a + 3;
        }

        export default { bar };
      `
    );

    await fs.writeFile(
      testPath("foo.mjs"),
      `
        function foo() {
          let sum = 0;
          // for..of syntax would be transpiled out
          for (let num of [1, 2, 3]) {
            sum += num;
          }

          return sum;
        }

        export default { foo };
      `
    );

    const [{ code }] = await bundle(testPath("main.mjs"), {
      transpileMode: TRANSPILE_MODES.SCOPED,
      transpileIgnores: [testPath("main.mjs")],
    });

    expect(code).toContain("const [a] = [fooLib.foo()];");
  });

  test("when transpiling only dependencies, it respects the ignore glob by transpiling files not included in glob", async () => {
    await fs.writeFile(
      testPath("main.mjs"),
      `
        import fooLib from './foo.mjs';

        function bar() {
          // destructuring would be transpiled out
          const [a] = [fooLib.foo()];

          return a + 3;
        }

        export default { bar };
      `
    );

    await fs.writeFile(
      testPath("foo.mjs"),
      `
        function foo() {
          let sum = 0;
          // for..of syntax would be transpiled out
          for (let num of [1, 2, 3]) {
            sum += num;
          }

          return sum;
        }

        export default { foo };
      `
    );
    const [{ code }] = await bundle(testPath("main.mjs"), {
      transpileMode: TRANSPILE_MODES.SCOPED,
      transpileIgnores: [testPath("main.mjs")],
    });

    expect(code).not.toContain("for (let num of [1, 2, 3]) {");
  });
});
