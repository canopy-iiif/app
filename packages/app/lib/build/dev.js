const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const http = require("http");
const {
  CONTENT_DIR,
  OUT_DIR,
  ASSETS_DIR,
  ensureDirSync,
} = require("../common");
  function resolveTailwindCli() {
  const bin = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss"
  );
  if (fs.existsSync(bin)) return { cmd: bin, args: [] };
  return { cmd: 'tailwindcss', args: [] };
}
const PORT = Number(process.env.PORT || 5001);
const BUILD_MODULE_PATH = path.resolve(__dirname, "build.js");
let onBuildSuccess = () => {};
let onBuildStart = () => {};
let onCssChange = () => {};
let nextBuildSkipIiif = false; // hint set by watchers
const UI_DIST_DIR = path.resolve(path.join(__dirname, "../../ui/dist"));
const APP_PACKAGE_ROOT = path.resolve(path.join(__dirname, "..", ".."));
const APP_LIB_DIR = path.join(APP_PACKAGE_ROOT, "lib");
const APP_UI_DIR = path.join(APP_PACKAGE_ROOT, "ui");
const APP_WATCH_TARGETS = [
  { dir: APP_LIB_DIR, label: "@canopy-iiif/app/lib" },
  { dir: APP_UI_DIR, label: "@canopy-iiif/app/ui" },
];
const HAS_APP_WORKSPACE = (() => {
  try {
    return fs.existsSync(path.join(APP_PACKAGE_ROOT, "package.json"));
  } catch (_) {
    return false;
  }
})();

function stripTailwindThemeLayer(targetPath) {
  try {
    const raw = fs.readFileSync(targetPath, "utf8");
    const cleaned = raw.replace(/@layer theme\{[\s\S]*?\}(?=@layer|$)/g, "");
    if (cleaned !== raw) fs.writeFileSync(targetPath, cleaned, "utf8");
  } catch (_) {}
}
let pendingModuleReload = false;
let building = false;
let buildAgain = false;

function prettyPath(p) {
  try {
    let rel = path.relative(process.cwd(), p);
    if (!rel) rel = ".";
    rel = rel.split(path.sep).join("/");
    if (!rel.startsWith("./") && !rel.startsWith("../")) rel = "./" + rel;
    return rel;
  } catch (_) {
    return p;
  }
}

function loadBuildFunction() {
  let mod = null;
  try {
    mod = require(BUILD_MODULE_PATH);
  } catch (error) {
    throw new Error(
      `[watch] Failed to load build module (${BUILD_MODULE_PATH}): ${
        error && error.message ? error.message : error
      }`
    );
  }
  const fn =
    mod && typeof mod.build === "function"
      ? mod.build
      : mod && mod.default && typeof mod.default.build === "function"
      ? mod.default.build
      : null;
  if (typeof fn !== "function") {
    throw new Error("[watch] Invalid build module export: expected build() function");
  }
  return fn;
}

function clearAppModuleCache() {
  try {
    const prefix = APP_PACKAGE_ROOT.endsWith(path.sep)
      ? APP_PACKAGE_ROOT
      : APP_PACKAGE_ROOT + path.sep;
    for (const key of Object.keys(require.cache || {})) {
      if (!key) continue;
      try {
        if (key === APP_PACKAGE_ROOT || key.startsWith(prefix)) {
          delete require.cache[key];
        }
      } catch (_) {}
    }
  } catch (_) {}
}

async function runBuild() {
  if (building) {
    buildAgain = true;
    return;
  }
  building = true;
  const hint = { skipIiif: !!nextBuildSkipIiif };
  nextBuildSkipIiif = false;
  try {
    if (pendingModuleReload) {
      clearAppModuleCache();
      pendingModuleReload = false;
    }
    const buildFn = loadBuildFunction();
    await buildFn(hint);
    try {
      onBuildSuccess();
    } catch (_) {}
  } catch (e) {
    console.error("Build failed:", e && e.message ? e.message : e);
  } finally {
    building = false;
    if (buildAgain) {
      buildAgain = false;
      debounceBuild();
    }
  }
}

function tryRecursiveWatch() {
  try {
    const watcher = fs.watch(
      CONTENT_DIR,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;
        try {
          console.log(
            `[watch] ${eventType}: ${prettyPath(
              path.join(CONTENT_DIR, filename)
            )}`
          );
        } catch (_) {}
        // If an MDX file changed, we can skip IIIF for the next build
        try {
          if (/\.mdx$/i.test(filename)) nextBuildSkipIiif = true;
        } catch (_) {}
        try {
          onBuildStart();
        } catch (_) {}
        debounceBuild();
      }
    );
    return watcher;
  } catch (e) {
    return null;
  }
}

let buildTimer = null;
function debounceBuild() {
  clearTimeout(buildTimer);
  buildTimer = setTimeout(runBuild, 150);
}

function watchPerDir() {
  const watchers = new Map();

  function watchDir(dir) {
    if (watchers.has(dir)) return;
    try {
      const w = fs.watch(dir, (eventType, filename) => {
        try {
          console.log(
            `[watch] ${eventType}: ${prettyPath(
              path.join(dir, filename || "")
            )}`
          );
        } catch (_) {}
        // If a new directory appears, add a watcher for it on next scan
        scan(dir);
        try {
          if (filename && /\.mdx$/i.test(filename)) nextBuildSkipIiif = true;
        } catch (_) {}
        try {
          onBuildStart();
        } catch (_) {}
        debounceBuild();
      });
      watchers.set(dir, w);
    } catch (_) {
      // ignore
    }
  }

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) watchDir(p);
    }
  }

  watchDir(CONTENT_DIR);
  scan(CONTENT_DIR);

  return () => {
    for (const w of watchers.values()) w.close();
  };
}

// Asset live-reload: copy changed file(s) into site/ without full rebuild
async function syncAsset(relativePath) {
  try {
    if (!relativePath) return;
    const src = path.join(ASSETS_DIR, relativePath);
    const rel = path.normalize(relativePath);
    const dest = path.join(OUT_DIR, rel);
    const exists = fs.existsSync(src);
    if (exists) {
      const st = fs.statSync(src);
      if (st.isDirectory()) {
        ensureDirSync(dest);
        return;
      }
      ensureDirSync(path.dirname(dest));
      await fsp.copyFile(src, dest);
      console.log(
        `[assets] Copied ${relativePath} -> ${path.relative(
          process.cwd(),
          dest
        )}`
      );
    } else {
      // Removed or renamed away: remove dest
      try {
        await fsp.rm(dest, { force: true, recursive: true });
      } catch (_) {}
      console.log(`[assets] Removed ${relativePath}`);
    }
  } catch (e) {
    console.warn("[assets] sync failed:", e && e.message ? e.message : e);
  }
}

function tryRecursiveWatchAssets() {
  try {
    const watcher = fs.watch(
      ASSETS_DIR,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;
        try {
          console.log(
            `[assets] ${eventType}: ${prettyPath(
              path.join(ASSETS_DIR, filename)
            )}`
          );
        } catch (_) {}
        // Copy just the changed asset and trigger reload
        syncAsset(filename).then(() => {
          try {
            onBuildSuccess();
          } catch (_) {}
        });
      }
    );
    return watcher;
  } catch (e) {
    return null;
  }
}

function watchAssetsPerDir() {
  const watchers = new Map();

  function watchDir(dir) {
    if (watchers.has(dir)) return;
    try {
      const w = fs.watch(dir, (eventType, filename) => {
        const rel = filename
          ? path.relative(ASSETS_DIR, path.join(dir, filename))
          : path.relative(ASSETS_DIR, dir);
        try {
          console.log(
            `[assets] ${eventType}: ${prettyPath(
              path.join(dir, filename || "")
            )}`
          );
        } catch (_) {}
        // If a new directory appears, add a watcher for it on next scan
        scan(dir);
        syncAsset(rel).then(() => {
          try {
            onBuildSuccess();
          } catch (_) {}
        });
      });
      watchers.set(dir, w);
    } catch (_) {
      // ignore
    }
  }

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) watchDir(p);
    }
  }

  if (fs.existsSync(ASSETS_DIR)) {
    watchDir(ASSETS_DIR);
    scan(ASSETS_DIR);
  }

  return () => {
    for (const w of watchers.values()) w.close();
  };
}

// Watch @canopy-iiif/app/ui dist output to enable live reload for UI edits during dev.
// When UI dist changes, rebuild the search runtime bundle and trigger a browser reload.
async function rebuildSearchBundle() {
  try {
    const search = require("./search");
    if (search && typeof search.ensureSearchRuntime === "function") {
      await search.ensureSearchRuntime();
    }
  } catch (_) {}
  try {
    onBuildSuccess();
  } catch (_) {}
}

function tryRecursiveWatchUiDist() {
  try {
    if (!fs.existsSync(UI_DIST_DIR)) return null;
    const watcher = fs.watch(
      UI_DIST_DIR,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;
        try {
          console.log(
            `[ui] ${eventType}: ${prettyPath(path.join(UI_DIST_DIR, filename))}`
          );
        } catch (_) {}
        // Lightweight path: rebuild only the search runtime bundle
        rebuildSearchBundle();
        // If the server-side UI bundle changed, trigger a site rebuild (skip IIIF)
        try {
          if (/server\.(js|mjs)$/.test(filename)) {
            nextBuildSkipIiif = true;
            try {
              onBuildStart();
            } catch (_) {}
            debounceBuild();
          }
        } catch (_) {}
      }
    );
    return watcher;
  } catch (_) {
    return null;
  }
}

function watchUiDistPerDir() {
  if (!fs.existsSync(UI_DIST_DIR)) return () => {};
  const watchers = new Map();
  function watchDir(dir) {
    if (watchers.has(dir)) return;
    try {
      const w = fs.watch(dir, (eventType, filename) => {
        try {
          console.log(
            `[ui] ${eventType}: ${prettyPath(path.join(dir, filename || ""))}`
          );
        } catch (_) {}
        scan(dir);
        rebuildSearchBundle();
        try {
          if (/server\.(js|mjs)$/.test(filename || "")) {
            nextBuildSkipIiif = true;
            try {
              onBuildStart();
            } catch (_) {}
            debounceBuild();
          }
        } catch (_) {}
      });
      watchers.set(dir, w);
    } catch (_) {}
  }
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) watchDir(p);
    }
  }
  watchDir(UI_DIST_DIR);
  scan(UI_DIST_DIR);
  return () => {
    for (const w of watchers.values()) w.close();
  };
}

const APP_WATCH_EXTENSIONS = new Set([".js", ".jsx", ".scss"]);

function shouldIgnoreAppSourcePath(p) {
  try {
    const resolved = path.resolve(p);
    const rel = path.relative(APP_PACKAGE_ROOT, resolved);
    if (!rel || rel === "") return false;
    if (rel.startsWith("..")) return true;
    const segments = rel.split(path.sep).filter(Boolean);
    if (!segments.length) return false;
    if (segments.includes("node_modules")) return true;
    if (segments.includes(".git")) return true;
    if (segments[0] === "ui" && segments[1] === "dist") return true;
    return false;
  } catch (_) {
    return true;
  }
}

function handleAppSourceChange(baseDir, eventType, filename, label) {
  if (!filename) return;
  const full = path.resolve(baseDir, filename);
  if (shouldIgnoreAppSourcePath(full)) return;
  const ext = path.extname(full).toLowerCase();
  if (!APP_WATCH_EXTENSIONS.has(ext)) return;
  try {
    const relLib = path.relative(APP_LIB_DIR, full);
    if (!relLib.startsWith("..") && !path.isAbsolute(relLib)) {
      pendingModuleReload = true;
    }
  } catch (_) {}
  try {
    console.log(
      `[pkg] ${eventType}: ${prettyPath(full)}${label ? ` (${label})` : ""}`
    );
  } catch (_) {}
  nextBuildSkipIiif = true;
  try {
    onBuildStart();
  } catch (_) {}
  debounceBuild();
}

function tryRecursiveWatchAppDir(dir, label) {
  try {
    return fs.watch(dir, { recursive: true }, (eventType, filename) => {
      handleAppSourceChange(dir, eventType, filename, label);
    });
  } catch (_) {
    return null;
  }
}

function watchAppDirPerDir(dir, label) {
  const watchers = new Map();

  function watchDir(target) {
    if (watchers.has(target)) return;
    if (shouldIgnoreAppSourcePath(target)) return;
    try {
      const w = fs.watch(target, (eventType, filename) => {
        if (filename) {
          handleAppSourceChange(target, eventType, filename, label);
        }
        scan(target);
      });
      watchers.set(target, w);
    } catch (_) {}
  }

  function scan(target) {
    let entries;
    try {
      entries = fs.readdirSync(target, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sub = path.join(target, entry.name);
      if (shouldIgnoreAppSourcePath(sub)) continue;
      watchDir(sub);
      scan(sub);
    }
  }

  watchDir(dir);
  scan(dir);

  return () => {
    for (const w of watchers.values()) {
      try {
        w.close();
      } catch (_) {}
    }
  };
}

function watchAppSources() {
  if (!HAS_APP_WORKSPACE) return () => {};
  const stops = [];
  for (const target of APP_WATCH_TARGETS) {
    const { dir, label } = target;
    if (!dir || !fs.existsSync(dir)) continue;
    console.log(`[Watching] ${prettyPath(dir)} (${label})`);
    const watcher = tryRecursiveWatchAppDir(dir, label);
    if (!watcher) {
      stops.push(watchAppDirPerDir(dir, label));
    } else {
      stops.push(() => {
        try {
          watcher.close();
        } catch (_) {}
      });
    }
  }
  return () => {
    for (const stop of stops) {
      try {
        if (typeof stop === "function") stop();
      } catch (_) {}
    }
  };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function startServer() {
  const clients = new Set();
  function broadcast(type) {
    for (const res of clients) {
      try {
        res.write(`data: ${type}\n\n`);
      } catch (_) {}
    }
  }
  onBuildStart = () => broadcast("building");
  onBuildSuccess = () => broadcast("reload");
  onCssChange = () => broadcast("css");

  const server = http.createServer((req, res) => {
    const origin = `http://${req.headers.host || `localhost:${PORT}`}`;
    let parsedUrl;
    try {
      parsedUrl = new URL(req.url || "/", origin);
    } catch (_) {
      parsedUrl = new URL("/", origin);
    }
    let pathname = decodeURI(parsedUrl.pathname || "/");
    // Serve dev toast assets and config
    if (pathname === "/__livereload-config") {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      const cfgPath = path.join(__dirname, "devtoast.config.json");
      let cfg = {
        buildingText: "Rebuilding…",
        reloadedText: "Reloaded",
        fadeMs: 800,
        reloadDelayMs: 200,
      };
      try {
        if (fs.existsSync(cfgPath)) {
          const raw = fs.readFileSync(cfgPath, "utf8");
          const parsedCfg = JSON.parse(raw);
          cfg = { ...cfg, ...parsedCfg };
        }
      } catch (_) {}
      res.end(JSON.stringify(cfg));
      return;
    }
    if (pathname === "/__livereload.css") {
      res.writeHead(200, {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      const cssPath = path.join(__dirname, "devtoast.css");
      let css = `#__lr_toast{position:fixed;bottom:12px;left:12px;background:rgba(0,0,0,.8);color:#fff;padding:6px 10px;border-radius:6px;font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:0;transition:opacity .15s ease}`;
      try {
        if (fs.existsSync(cssPath)) css = fs.readFileSync(cssPath, "utf8");
      } catch (_) {}
      res.end(css);
      return;
    }
    if (pathname === "/__livereload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      clients.add(res);
      const keepAlive = setInterval(() => {
        try {
          res.write(": ping\n\n");
        } catch (_) {}
      }, 30000);
      req.on("close", () => {
        clearInterval(keepAlive);
        clients.delete(res);
      });
      return;
    }
    if (pathname === "/") pathname = "/index.html";

    function toSitePath(p) {
      const rel = p.startsWith("/") ? `.${p}` : p;
      return path.resolve(OUT_DIR, rel);
    }

    const ensureLeadingSlash = (p) => (p.startsWith("/") ? p : `/${p}`);
    const basePath = ensureLeadingSlash(pathname);
    const noTrailing = basePath !== "/" ? basePath.replace(/\/+$/, "") : basePath;
    const attempts = [];

    const primaryPath = noTrailing === "/" ? "/index.html" : noTrailing;
    attempts.push(toSitePath(primaryPath));

    if (!/\.html$/i.test(primaryPath)) {
      attempts.push(toSitePath(`${primaryPath}.html`));
    }

    const withoutHtml = primaryPath.replace(/\.html$/i, "");
    attempts.push(toSitePath(`${withoutHtml}/index.html`));

    let filePath = null;
    for (const candidate of attempts) {
      if (!candidate) continue;
      let stat;
      try {
        stat = fs.statSync(candidate);
      } catch (_) {
        continue;
      }
      if (stat.isFile()) {
        filePath = candidate;
        break;
      }
      if (stat.isDirectory()) {
        const idx = path.join(candidate, "index.html");
        if (fs.existsSync(idx)) {
          filePath = idx;
          break;
        }
      }
    }
    if (!filePath) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
      return;
    }

    // Prevent path traversal by ensuring resolved path stays under SITE_DIR
    let resolved = path.resolve(filePath);
    if (!resolved.startsWith(OUT_DIR)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    // If a directory slipped through, try its index.html
    try {
      const st = fs.statSync(resolved);
      if (st.isDirectory()) {
        const idx = path.join(resolved, "index.html");
        if (fs.existsSync(idx)) {
          filePath = idx;
          resolved = path.resolve(filePath);
        } else {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }
      }
    } catch (_) {}

    // Ensure resolved reflects the final filePath
    resolved = path.resolve(filePath);
    const ext = path.extname(resolved).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    // Dev: always disable caching so reloads fetch fresh assets
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    if (ext === ".html") {
      try {
        let html = fs.readFileSync(resolved, "utf8");
        const snippet = `
<link rel="stylesheet" href="/__livereload.css">
<script>(function(){
  var t, cfg = { buildingText: 'Rebuilding…', reloadedText: 'Reloaded', fadeMs: 800, reloadDelayMs: 200 };
  fetch('/__livereload-config').then(function(r){ return r.json(); }).then(function(j){ cfg = j; }).catch(function(){});
  function toast(m){ var el = document.getElementById('__lr_toast'); if(!el){ el=document.createElement('div'); el.id='__lr_toast'; document.body.appendChild(el); } el.textContent=m; el.style.opacity='1'; clearTimeout(t); t=setTimeout(function(){ el.style.opacity='0'; }, cfg.fadeMs); }
  (function(){
    var lastCssSwap = 0;
    function swapLink(l){
      try{
        var href = l.getAttribute('href') || '';
        var base = href.split('?')[0];
        var next = l.cloneNode();
        next.setAttribute('href', base + '?v=' + Date.now());
        // Load new stylesheet off-screen, then atomically switch to avoid FOUC
        next.media = 'print';
        next.onload = function(){ try { next.media = 'all'; l.remove(); } catch(_){} };
        l.parentNode.insertBefore(next, l.nextSibling);
      }catch(_){ }
    }
    window.__canopyReloadCss = function(){
      var now = Date.now();
      if (now - lastCssSwap < 200) return; // throttle spammy events
      lastCssSwap = now;
      try {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(function(l){
          try {
            var href = l.getAttribute('href') || '';
            var base = href.split('?')[0];
            if (base.indexOf('styles/styles.css') !== -1) swapLink(l);
          } catch(_) {}
        });
      } catch(_) {}
    };
  })();
  var es = new EventSource('/__livereload');
  es.onmessage = function(e){
    if (e.data === 'building') { /* no toast for css-only builds to reduce blinking */ }
    else if (e.data === 'css') { if (window.__canopyReloadCss) window.__canopyReloadCss(); }
    else if (e.data === 'reload') { toast(cfg.reloadedText); setTimeout(function(){ location.reload(); }, cfg.reloadDelayMs); }
  };
  window.addEventListener('beforeunload', function(){ try { es.close(); } catch(e) {} });
})();</script>`;
        html = html.includes("</body>")
          ? html.replace("</body>", snippet + "</body>")
          : html + snippet;
        res.end(html);
      } catch (e) {
        res.statusCode = 500;
        res.end("Error serving HTML");
      }
    } else {
      fs.createReadStream(resolved).pipe(res);
    }
  });

  server.listen(PORT, () => {
    console.log(`Serving site on http://localhost:${PORT}`);
  });

  return server;
}

async function dev() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("No content directory found at", CONTENT_DIR);
    process.exit(1);
  }
  // Start server before the initial build so build logs follow server standup
  startServer();
  console.log("Initial build...");
  // Expose a base URL for builders to construct absolute ids/links
  if (!process.env.CANOPY_BASE_URL) {
    process.env.CANOPY_BASE_URL = `http://localhost:${PORT}`;
  }
  // In dev, let the Tailwind watcher own CSS generation to avoid duplicate
  // one-off builds that print "Rebuilding..." messages. Skip ensureStyles()
  // within build() by setting an environment flag.
  process.env.CANOPY_SKIP_STYLES = process.env.DEV_ONCE ? "" : "1";
  // Suppress noisy Browserslist old data warning in dev/tailwind
  process.env.BROWSERSLIST_IGNORE_OLD_DATA = "1";
  if (process.env.DEV_ONCE) {
    // Build once and exit (used for tests/CI)
    runBuild()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    return;
  }
  // Run the initial build synchronously now that the server is up
  await runBuild();

  // Start Tailwind watcher if config + input exist (after initial build)
  try {
    const root = process.cwd();
    const appStylesDir = path.join(root, "app", "styles");
    const twConfigsRoot = [
      "tailwind.config.js",
      "tailwind.config.cjs",
      "tailwind.config.mjs",
      "tailwind.config.mts",
      "tailwind.config.ts",
    ].map((n) => path.join(root, n));
    const twConfigsApp = [
      "tailwind.config.js",
      "tailwind.config.cjs",
      "tailwind.config.mjs",
      "tailwind.config.mts",
      "tailwind.config.ts",
    ].map((n) => path.join(appStylesDir, n));
    let configPath = [...twConfigsApp, ...twConfigsRoot].find((p) => {
      try {
        return fs.existsSync(p);
      } catch (_) {
        return false;
      }
    });
    const fallbackConfig = (() => {
      try {
        return require.resolve("@canopy-iiif/app/ui/tailwind-default-config");
      } catch (_) {
        return null;
      }
    })();
    if (!configPath) {
      configPath = fallbackConfig;
      if (configPath) {
        console.log(
          "[tailwind] no local config found — using the built-in Canopy config"
        );
      }
    }
    if (!configPath) {
      throw new Error("[tailwind] Unable to resolve a Tailwind config file.");
    }
    const inputCandidates = [
      path.join(appStylesDir, "index.css"),
      path.join(CONTENT_DIR, "_styles.css"),
    ];
    const inputCss = inputCandidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch (_) {
        return false;
      }
    });
    if (!inputCss) {
      throw new Error(
        "[tailwind] Missing Tailwind entry stylesheet. Create app/styles/index.css (or content/_styles.css)."
      );
    }
    const outputCss = path.join(OUT_DIR, "styles", "styles.css");
    ensureDirSync(path.dirname(outputCss));

    const cli = resolveTailwindCli();
    if (!cli) {
      throw new Error(
        "[tailwind] Tailwind CLI not found. Install the 'tailwindcss' package in the workspace."
      );
    }

    const fileSizeKb = (p) => {
      try {
        const st = fs.statSync(p);
        return st && st.size ? (st.size / 1024).toFixed(1) : "0.0";
      } catch (_) {
        return "0.0";
      }
    };

    const baseArgs = [
      "-i",
      inputCss,
      "-o",
      outputCss,
      "-c",
      configPath,
      "--minify",
    ];

    const initial = spawnSync(cli.cmd, [...cli.args, ...baseArgs], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
    });
    if (!initial || initial.status !== 0) {
      if (initial && initial.stderr) {
        try { process.stderr.write(initial.stderr); } catch (_) {}
      }
      throw new Error("[tailwind] Initial Tailwind build failed.");
    }
    stripTailwindThemeLayer(outputCss);
    console.log(
      `[tailwind] initial build ok (${fileSizeKb(outputCss)} KB) →`,
      prettyPath(outputCss)
    );

    const watchArgs = [
      "-i",
      inputCss,
      "-o",
      outputCss,
      "--watch",
      "-c",
      configPath,
      "--minify",
    ];
    let child = null;
    let unmuted = false;
    let cssWatcherAttached = false;

    function attachCssWatcherOnce() {
      if (cssWatcherAttached) return;
      cssWatcherAttached = true;
      try {
        fs.watch(outputCss, { persistent: false }, () => {
          stripTailwindThemeLayer(outputCss);
          if (!unmuted) {
            unmuted = true;
            console.log(
              `[tailwind] watching ${prettyPath(
                inputCss
              )} — compiled (${fileSizeKb(outputCss)} KB)`
            );
          }
          try {
            onCssChange();
          } catch (_) {}
        });
      } catch (_) {}
    }

    function compileTailwindOnce() {
      const res = spawnSync(cli.cmd, [...cli.args, ...baseArgs], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
      });
      if (!res || res.status !== 0) {
        if (res && res.stderr) {
          try { process.stderr.write(res.stderr); } catch (_) {}
        }
        throw new Error("[tailwind] On-demand Tailwind compile failed.");
      }
      stripTailwindThemeLayer(outputCss);
      console.log(
        `[tailwind] compiled (${fileSizeKb(outputCss)} KB) →`,
        prettyPath(outputCss)
      );
      try {
        onCssChange();
      } catch (_) {}
    }

    function startTailwindWatcher() {
      unmuted = false;
      const proc = spawn(cli.cmd, [...cli.args, ...watchArgs], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
      });
      if (proc.stdout)
        proc.stdout.on("data", (d) => {
          const s = d ? String(d) : "";
          if (!unmuted) {
            if (/error/i.test(s)) {
              try { process.stdout.write("[tailwind] " + s); } catch (_) {}
            }
          } else {
            try { process.stdout.write(s); } catch (_) {}
          }
        });
      if (proc.stderr)
        proc.stderr.on("data", (d) => {
          const s = d ? String(d) : "";
          if (!unmuted) {
            if (s.trim()) {
              try { process.stderr.write("[tailwind] " + s); } catch (_) {}
            }
          } else {
            try { process.stderr.write(s); } catch (_) {}
          }
        });
      proc.on("exit", (code) => {
        if (code !== null && code !== 0) {
          console.error("[tailwind] watcher exited with code", code);
          process.exit(typeof code === "number" ? code : 1);
        }
      });
      attachCssWatcherOnce();
      return proc;
    }

    const safeCompile = (label) => {
      try {
        compileTailwindOnce();
      } catch (err) {
        console.error(label ? `${label}: ${err.message || err}` : err);
        process.exit(1);
      }
    };

    child = startTailwindWatcher();

    const uiPlugin = path.join(
      APP_UI_DIR,
      "tailwind-canopy-iiif-plugin.js"
    );
    const uiPreset = path.join(
      APP_UI_DIR,
      "tailwind-canopy-iiif-preset.js"
    );
    const uiStylesDir = path.join(APP_UI_DIR, "styles");
    const uiStylesCss = path.join(uiStylesDir, "index.css");
    const pluginFiles = [uiPlugin, uiPreset].filter((p) => {
      try {
        return fs.existsSync(p);
      } catch (_) {
        return false;
      }
    });
    let restartTimer = null;
    let uiCssWatcherAttached = false;
    const scheduleTailwindRestart = (message, compileLabel) => {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (message) console.log(message);
        try {
          if (child && !child.killed) child.kill();
        } catch (_) {}
        safeCompile(compileLabel);
        child = startTailwindWatcher();
        try { onBuildStart(); } catch (_) {}
      }, 120);
    };
    for (const f of pluginFiles) {
      try {
        fs.watch(f, { persistent: false }, () => {
          scheduleTailwindRestart(
            "[tailwind] detected UI plugin/preset change — restarting Tailwind",
            "[tailwind] compile after plugin change failed"
          );
        });
      } catch (_) {}
    }
    const attachCssWatcher = () => {
      if (uiCssWatcherAttached) {
        if (fs.existsSync(uiStylesCss)) return;
        uiCssWatcherAttached = false;
      }
      if (!fs.existsSync(uiStylesCss)) return;
      const handler = () =>
        scheduleTailwindRestart(
          "[tailwind] detected @canopy-iiif/app/ui styles change — restarting Tailwind",
          "[tailwind] compile after UI styles change failed"
        );
      try {
        const watcher = fs.watch(uiStylesCss, { persistent: false }, handler);
        uiCssWatcherAttached = true;
        watcher.on("close", () => {
          uiCssWatcherAttached = false;
        });
      } catch (_) {
        try {
          fs.watchFile(uiStylesCss, { interval: 250 }, handler);
          uiCssWatcherAttached = true;
        } catch (_) {}
      }
    };
    attachCssWatcher();
    const handleUiSassChange = () => {
      attachCssWatcher();
      scheduleTailwindRestart(
        "[tailwind] detected @canopy-iiif/app/ui Sass change — restarting Tailwind",
        "[tailwind] compile after UI Sass change failed"
      );
    };
    if (fs.existsSync(uiStylesDir)) {
      try {
        fs.watch(
          uiStylesDir,
          { persistent: false, recursive: true },
          (evt, fn) => {
            try {
              if (fn && /\.s[ac]ss$/i.test(String(fn))) handleUiSassChange();
            } catch (_) {}
          }
        );
      } catch (_) {
        const watchers = new Map();
        const watchDir = (dir) => {
          if (watchers.has(dir)) return;
          try {
            const w = fs.watch(
              dir,
              { persistent: false },
              (evt, fn) => {
                try {
                  if (fn && /\.s[ac]ss$/i.test(String(fn))) handleUiSassChange();
                } catch (_) {}
                scan(dir);
              }
            );
            watchers.set(dir, w);
          } catch (_) {}
        };
        const scan = (dir) => {
          try {
            const entries = fs.readdirSync(dir, {
              withFileTypes: true,
            });
            for (const e of entries) {
              const p = path.join(dir, e.name);
              if (e.isDirectory()) {
                watchDir(p);
                scan(p);
              }
            }
          } catch (_) {}
        };
        watchDir(uiStylesDir);
        scan(uiStylesDir);
      }
    }
    if (fs.existsSync(configPath)) {
      try {
        fs.watch(configPath, { persistent: false }, () => {
          scheduleTailwindRestart(
            "[tailwind] tailwind.config change — restarting Tailwind",
            "[tailwind] compile after config change failed"
          );
        });
      } catch (_) {}
    }
    const stylesDir = path.dirname(inputCss);
    if (stylesDir && stylesDir.includes(path.join("app", "styles"))) {
      let cssDebounce = null;
      try {
        fs.watch(stylesDir, { persistent: false }, (evt, fn) => {
          clearTimeout(cssDebounce);
          cssDebounce = setTimeout(() => {
            try { onBuildStart(); } catch (_) {}
            safeCompile("[tailwind] compile after CSS change failed");
            try { onCssChange(); } catch (_) {}
          }, 50);
        });
      } catch (_) {}
    }
  } catch (err) {
    console.error("[tailwind] setup failed:", err && err.message ? err.message : err);
    process.exit(1);
  }
  console.log("[Watching]", prettyPath(CONTENT_DIR), "(Ctrl+C to stop)");
  const rw = tryRecursiveWatch();
  if (!rw) watchPerDir();
  // Watch assets for live copy without full rebuild
  if (fs.existsSync(ASSETS_DIR)) {
    console.log("[Watching]", prettyPath(ASSETS_DIR), "(assets live-reload)");
    const arw = tryRecursiveWatchAssets();
    if (!arw) watchAssetsPerDir();
  }
  // Watch UI dist for live-reload and targeted search runtime rebuilds
  if (fs.existsSync(UI_DIST_DIR)) {
    console.log(
      "[Watching]",
      prettyPath(UI_DIST_DIR),
      "(@canopy-iiif/app/ui dist)"
    );
    const urw = tryRecursiveWatchUiDist();
    if (!urw) watchUiDistPerDir();
  }
  if (HAS_APP_WORKSPACE) {
    watchAppSources();
  }
}

module.exports = { dev };

if (require.main === module) dev();
