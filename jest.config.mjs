export default {
  verbose: true,
  testMatch: ["<rootDir>/test/**/*.?js"],
  transform: {},
  moduleFileExtensions: ["js", "jsx", "mjs", "json"],
  testPathIgnorePatterns: ["node_modules", "__mocks__", "support"],
  roots: ["<rootDir>/src/", "<rootDir>/test/"],
};
