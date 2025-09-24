module.exports = {
  testEnvironment: "node",
  roots: ["../packages", "../tests"],
  testMatch: ["**/*.test.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/site/",
    "/packages/app/ui/",
    "/tests/e2e/", // Exclude Playwright e2e tests from Jest
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "packages/**/*.js",
    "!**/ui/**",
    "!**/node_modules/**",
    "!**/site/**",
  ],
  coverageDirectory: "coverage",
};
