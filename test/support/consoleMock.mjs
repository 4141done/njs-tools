/**
* @module consoleMock
* Mock for the console object with a convenience method to perform the mock
* intended for testing.
* This is make necessary by an open bug in `mock-fs`: https://github.com/tschaub/mock-fs/issues/234
* Code adapted from this workaround: https://github.com/tschaub/mock-fs/issues/234#issuecomment-551965878
*/


function format(entry) {
  if (typeof entry === "object") {
    try {
      return JSON.stringify(entry);
    } catch (e) { }
  }

  return entry;
}

export function log(...msgs) {
  process.stdout.write(msgs.map(format).join(" ") + "\n");
}

const mock = {
  warn: log,
  error: log,
  log: log
};

/**
* Assigns a fake console interface to global.console 
*/
export function mockConsoleForMockFs() {
  global.console = mock;
}
