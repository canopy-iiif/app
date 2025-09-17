module.exports = {
  testEnvironment: "node",
  roots: ["../packages", "../tests"],
  testMatch: ["**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/site/", "/packages/app/ui/"],
  collectCoverage: true,
  collectCoverageFrom: [
    "packages/**/*.js",
    "!**/ui/**",
    "!**/node_modules/**",
    "!**/site/**",
  ],
  coverageDirectory: "coverage",
};
