// @ts-check
const path = require("node:path");
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: path.join(__dirname, "e2e"),
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5001",
    headless: true,
  },
  webServer: {
    command: "bash -lc 'cd .. && npm run dev -- --dev'",
    url: "http://localhost:5001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      CANOPY_MOCK_SEARCH: "1",
      CANOPY_CHUNK_SIZE: "10",
      CANOPY_FETCH_CONCURRENCY: "1",
      CANOPY_SKIP_IIIF: "1",
    },
  },
});
