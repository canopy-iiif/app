/**
 * Canopy Build and Development Orchestration
 *
 * Responsibilities
 * - Provide a single, stable command for both local development and production builds.
 * - Orchestrate the UI build in the combined package (@canopy-iiif/app) to build or watch assets.
 * - Delegate site building and dev server to the library in (@canopy-iiif/app).
 * - Handle errors and shutdown cleanly so contributors have a smooth experience.
 *
 * Usage
 * - Build site: `npm run build`
 * - Dev server: `npm run dev`
 *
 * Mode detection
 * - Primary: inferred from the npm script name (npm_lifecycle_event = "build" | "dev").
 * - Overrides: CLI flags "--build" or "--dev" or env CANOPY_MODE ("build" | "dev").
 *
 * Note: This file is intended to be long-lived and stable. No changes should be made
 * without careful consideration. This especially includes references to
 * the combined package (@canopy-iiif/app) providing both the library and UI.
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

/** Logging helpers */

const log = (msg) => console.log(`[canopy] ${msg}`);
const warn = (msg) => console.warn(`[canopy][warn] ${msg}`);
const err = (msg) => console.error(`[canopy][error] ${msg}`);

/** Track a long-running child (UI watcher) so we can clean it up on exit. */
let uiWatcherChild = null;

/** Detect the current mode (build or dev) */

function getMode() {
  // Highest priority: explicit CLI flag
  const cli = new Set(process.argv.slice(2));
  if (cli.has("--dev")) return "dev";
  if (cli.has("--build")) return "build";

  // Next: explicit environment override
  if (process.env.CANOPY_MODE === "dev") return "dev";
  if (process.env.CANOPY_MODE === "build") return "build";

  // Default: infer from npm script name
  const npmScript = process.env.npm_lifecycle_event;
  if (npmScript === "dev") return "dev";
  if (npmScript === "build") return "build";

  // Fallback: build is the safer default for CI or direct runs
  return "build";
}

/**
 * Run a short-lived command (e.g., a one-off build) and return a Promise.
 */

function runOnce(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: false, ...opts });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

/**
 * Start a long-lived command (e.g., a file watcher). Returns the ChildProcess.
 */

function start(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: false, ...opts });
  child.on("error", (e) =>
    warn(`Subprocess error (${cmd}): ${e.message || e}`)
  );
  return child;
}

/**
 * Build or watch the UI package. If the UI workspace is missing or its script
 * is not defined, we log a helpful warning and continue (the lib can still work).
 */
async function prepareUi(mode) {
  if (mode === "build") {
    log("Building UI assets (@canopy-iiif/app/ui)");
    try {
      await runOnce("npm", ["-w", "@canopy-iiif/app", "run", "ui:build"]);
      log("UI assets built");
    } catch (e) {
      warn(`UI build skipped: ${e.message || e}`);
    }
    return null;
  }

  // Dev mode: do a one-off UI build first so its logs/render appear before site build
  try {
    log("Prebuilding UI assets (@canopy-iiif/app/ui)");
    await runOnce("npm", ["-w", "@canopy-iiif/app", "run", "ui:build"]);
  } catch (e) {
    warn(`UI prebuild skipped: ${e.message || e}`);
  }
  // Start the UI watcher in the background
  log("Starting UI watcher (@canopy-iiif/app/ui)");
  try {
    uiWatcherChild = start("npm", ["-w", "@canopy-iiif/app", "run", "ui:watch"]);
  } catch (e) {
    warn(`UI watch skipped: ${e.message || e}`);
    uiWatcherChild = null;
  }
  return uiWatcherChild;
}
/**
 * Load the library which exposes build() and dev(). The lib is CommonJS, so
 * we use createRequire from ESM to get a stable exports object.
 */
function loadLibraryApi() {
  const requireCjs = createRequire(import.meta.url);
  let lib;
  try {
    lib = requireCjs("@canopy-iiif/app");
  } catch (e) {
    // Fallback: load local workspace directly (dev convenience)
    try {
      const localPath = new URL('../../packages/app/lib/index.js', import.meta.url).pathname;
      lib = requireCjs(localPath);
    } catch (e2) {
      const hint = [
        "Unable to load @canopy-iiif/app.",
        "Ensure dependencies are installed (npm install)",
        "and that peer deps like 'react' are present.",
      ].join(" ");
      const detail = (e && e.message ? `\nCaused by: ${e.message}` : "") + (e2 && e2.message ? `\nFallback error: ${e2.message}` : "");
      throw new Error(`${hint}${detail}`);
    }
  }
  const api =
    lib && (typeof lib.build === "function" || typeof lib.dev === "function")
      ? lib
      : lib && lib.default
      ? lib.default
      : lib;
  if (
    !api ||
    (typeof api.build !== "function" && typeof api.dev !== "function")
  ) {
    throw new TypeError(
      "Invalid @canopy-iiif/app export: expected functions build() and/or dev()."
    );
  }
  return api;
}

/** Cleanup and signal handling */

function attachSignalHandlers() {
  const clean = () => {
    if (uiWatcherChild && !uiWatcherChild.killed) {
      try {
        uiWatcherChild.kill();
      } catch (_) {}
    }
  };
  process.on("SIGINT", () => {
    clean();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    clean();
    process.exit(143);
  });
  process.on("exit", clean);
}

/** Main */

async function main() {
  process.title = "canopy-app";
  const mode = getMode();
  log(`Mode: ${mode}`);

  // Verification-only: allow CI to run `node app/scripts/canopy-build.mjs --verify`
  if (new Set(process.argv.slice(2)).has("--verify")) {
    verifyBuildOutput(process.env.CANOPY_OUT_DIR || "site");
    return;
  }

  // Prepare UI first so assets exist or watcher is running
  await prepareUi(mode);

  // Load library and delegate
  const api = loadLibraryApi();
  try {
    if (mode === "dev") {
      attachSignalHandlers();
      log("Starting dev server...");
      await api.dev(); // Keeps process alive
    } else {
      log("Building site...");
      await api.build();
      log("Build complete");
      // Optional CI verification if enabled via env
      if (
        process.env.CANOPY_VERIFY === "1" ||
        process.env.CANOPY_VERIFY === "true"
      ) {
        verifyBuildOutput(process.env.CANOPY_OUT_DIR || "site");
      }
    }
  } finally {
    // Cleanup
    if (uiWatcherChild && !uiWatcherChild.killed) {
      try {
        uiWatcherChild.kill();
      } catch (_) {}
    }
  }
}

/** Run and handle any unexpected failures with a friendly message */

main().catch((e) => {
  err(e && e.stack ? e.stack : e && e.message ? e.message : String(e));
  process.exit(1);
});

/** Verify build output */

function verifyBuildOutput(outDir = "site") {
  const root = path.resolve(outDir);
  function walk(dir) {
    let count = 0;
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) count += walk(p);
      else if (e.isFile() && p.toLowerCase().endsWith(".html")) count++;
    }
    return count;
  }
  const pages = walk(root);
  if (!pages) {
    throw new Error("CI check failed: no HTML pages generated in 'site/'.");
  }
  log(`CI check: found ${pages} HTML page(s) in ${root}.`);
}
