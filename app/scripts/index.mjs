/**
 * Canopy Build and Development Orchestration
 *
 * Responsibilities
 * - Provide a single, stable command for both local development and production builds.
 * - Orchestrate the UI package (@canopy-iiif/ui) to build or watch assets.
 * - Delegate site building and dev server to the library (@canopy-iiif/lib).
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
 * the core library (@canopy-iiif/lib) and UI components (@canopy-iiif/ui).
 */

import { createRequire } from "node:module";
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
    log("Building UI assets (@canopy-iiif/ui)");
    try {
      await runOnce("npm", ["-w", "@canopy-iiif/ui", "run", "build"]);
      log("UI assets built");
    } catch (e) {
      warn(`UI build skipped: ${e.message || e}`);
    }
    return null;
  }

  // Dev mode: start the UI watcher in the background
  log("Starting UI watcher (@canopy-iiif/ui)");
  try {
    uiWatcherChild = start("npm", ["-w", "@canopy-iiif/ui", "run", "watch"]);
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
    lib = requireCjs("@canopy-iiif/lib");
  } catch (e) {
    throw new Error(
      "Unable to load @canopy-iiif/lib. Did you install dependencies?"
    );
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
      "Invalid @canopy-iiif/lib export: expected functions build() and/or dev()."
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
