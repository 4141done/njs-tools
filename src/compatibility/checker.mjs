import * as esprima from "esprima";
import chalk from "chalk";
import nodeBuiltins from "./node-builtins.mjs";
import webApis from "./web-apis.mjs";

function Results(initValues = {}) {
  return Object.assign(
    {
      regex: [],
      nonstandardApis: [],
      consoleLogs: [],
    },
    initValues
  );
}

function genCompatibilityReport(rawCode, filepath) {
  const results = new Results();

  esprima.parseModule(rawCode, { loc: true, tolerant: true }, (node) => {
    if (node.type === "Identifier") {
      if (isNonStandardAPI(node.name)) {
        results.nonstandardApis.push(node);
      }
    }
    if (_isRegexLiteral(node) || _isRegexConstructor(node)) {
      results.regex.push(_normalizeRegexNode(node));
    }

    if (_isConsoleCall(node)) {
      results.consoleLogs.push(node);
    }
  });

  _generateReport(results, filepath);
}

function isNonStandardAPI(node) {
  return webApis.concat(nodeBuiltins).includes(node);
}

function _normalizeRegexNode(node) {
  let regexp;

  if (_isRegexLiteral(node)) {
    regexp = node.raw;
  } else if (_isRegexConstructor(node)) {
    const newExpFirstArg = node.arguments[0];
    const newExpFlagsArg = node.arguments[1]?.value; // flags are optional in `new Regexp`

    if (_isRegexLiteral(newExpFirstArg)) {
      regexp = newExpFirstArg.raw;
    } else if (_isJSLiteral(newExpFirstArg)) {
      regexp = `/${newExpFirstArg.value}/${newExpFlagsArg ? newExpFlagsArg : ""
        }`;
    }
  }

  return {
    type: node.type,
    regexp: regexp,
    loc: node.loc,
  };
}

// TODO: write to file an option
// TODO: organize better and colorize with chalk
// Export report as a json structure and let the CLI handle rendering it
function _generateReport(results, filepath) {
  console.log(chalk.blue("CODE COMPATIBILITY REPORT:"));
  console.log(
    "----------------------------------------------------------------"
  );
  console.log(`Found ${results.regex.length} regular expression(s)`);
  for (let regex of results.regex) {
    console.log(`    ${regex.type} at ${filepath}:${regex.loc.start.line}`);
  }
  console.log(`Found ${results.consoleLogs.length} call(s) to console`);
  for (let log of results.consoleLogs) {
    console.log(
      `    'console.log' statement at ${filepath}:${log.loc.start.line}`
    );
  }
  console.log(
    `Found ${results.nonstandardApis.length} references to nonstandard apis`
  );
  for (let api of results.nonstandardApis) {
    console.log(
      `    Reference to '${api.name}' at ${filepath}:${api.loc.start.line}`
    );
  }

  console.log(
    "----------------------------------------------------------------"
  );
  console.log(
    chalk.red("Note:") +
    " Compatibility report is for reference only and should\n" +
    "be a guide to check for areas that may not be compatible.\n" +
    "Compatibility should be confirmed by testing against your use case."
  );
  console.log(
    "----------------------------------------------------------------"
  );
}

function _isConsoleCall(node) {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    node.callee.object.type === "Identifier" &&
    node.callee.object.name === "console"
  );
}

// TODO: implement a check for lookbehinds \(\?\<[\=\!].+\) OR unbounded lookbehinds \(\?\<[\=\!].+\*\)
function _isRegexLiteral(node) {
  return node.constructor.name === "RegexLiteral";
}

function _isRegexConstructor(node) {
  return node.type === "NewExpression" && node.callee.name === "RegExp";
}

function _isJSLiteral(node) {
  return node.constructor.name === "Literal";
}

export { isNonStandardAPI, genCompatibilityReport };
