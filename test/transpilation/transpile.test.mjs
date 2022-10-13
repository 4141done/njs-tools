// The below are necessary since we are using ES6
// modules and both `jest` and `mock-fs` have limited support
import { jest } from "@jest/globals";
import fs from "fs/promises";
import { testFile, restoreTestDir } from "../support/testFileHelper.mjs";

import {
  bundle,
  TRANSPILE_MODES,
  write_outputs,
} from "../../src/transpilation/transpiler.mjs";

describe("bundle", () => {
  beforeEach(async () => {
    await restoreTestDir();
  });

  afterEach(async () => {
    await restoreTestDir();
  });

  test("produces the default export required by njs", async () => {
    fs.writeFile(
      testFile("main.mjs"),
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
      testFile("foo.mjs"),
      `
        function foo() {
          return 4;
        }

        export default { foo };
      `
    );

    const [{ code }] = await bundle(testFile("main.mjs"), {
      transpileMode: "NONE",
    });

    expect(code).toContain("export default main");
  });

  test("when transpiling only dependencies, it respects the ignore glob by leaving local files specified in glob", async () => {
    await fs.writeFile(
      testFile("main.mjs"),
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
      testFile("foo.mjs"),
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

    const [{ code }] = await bundle(testFile("main.mjs"), {
      transpileMode: "DEPENDENCIES",
      transpileIgnores: [testFile("main.mjs")],
    });

    expect(code).toContain("const [a] = [fooLib.foo()];");
  });

  test("when transpiling only dependencies, it respects the ignore glob by transpiling files not included in glob", async () => {
    await fs.writeFile(
      testFile("main.mjs"),
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
      testFile("foo.mjs"),
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
    const [{ code }] = await bundle(testFile("main.mjs"), {
      transpileMode: "DEPENDENCIES",
      transpileIgnores: [testFile("main.mjs")],
    });

    console.log(fs);

    expect(code).not.toContain("for (let num of [1, 2, 3]) {");
  });
});
