// The below are necessary since we are using ES6
// modules and both `jest` and `mock-fs` have limited support
import { jest } from '@jest/globals';
import { mockConsoleForMockFs } from '../support/consoleMock.mjs';
import mockFs from 'mock-fs';

import { bundle, TRANSPILE_MODES, write_outputs } from '../../src/transpilation/transpiler.mjs';

describe('bundle', () => {
  beforeEach(() => {
    mockConsoleForMockFs();
  });

  afterEach(() => {
    mockFs.restore();
  });

  test('produces the default export required by njs', async () => {
    // This mock mimics bundling of two local files
    mockFs({
      './main.mjs': `
        import fooLib from './foo.mjs';
        
        function bar() {
          const a = fooLib.foo();
          
          return a + 3;
        }
        
        export default { bar };
      `,
      './foo.mjs': `
        function foo() {
          return 4;
        }
        
        export default { foo };
      `
    })

    const [{ code }] = await bundle('./main.mjs', { transpileMode: 'NONE' });

    expect(code).toContain("export default main");
  });
});
