const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { spawn } = require("child_process");
const { build } = require("../build/build");
const http = require("http");
const url = require("url");
const {
  CONTENT_DIR,
  OUT_DIR,
  ASSETS_DIR,
  ensureDirSync,
} = require("../common");
const twHelper = (() => {
  try {
    return require("../../helpers/build-tailwind");
  } catch (_) {
    return null;
  }
})();
function resolveTailwindCli() {
  try {
    const cliJs = require.resolve("tailwindcss/lib/cli.js");
    return { cmd: process.execPath, args: [cliJs] };
  } catch (_) {}
  try {
    const bin = path.join(
      process.cwd(),
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss"
    );
    if (fs.existsSync(bin)) return { cmd: bin, args: [] };
  } catch (_) {}
  return null;
}
const PORT = Number(process.env.PORT || 3000);
let onBuildSuccess = () => {};
let onBuildStart = () => {};
let onCssChange = () => {};
let nextBuildSkipIiif = false; // hint set by watchers
const UI_DIST_DIR = path.resolve(path.join(__dirname, "../../ui/dist"));

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

async function runBuild() {
  try {
    const hint = { skipIiif: !!nextBuildSkipIiif };
    nextBuildSkipIiif = false;
    await build(hint);
    try {
      onBuildSuccess();
    } catch (_) {}
  } catch (e) {
    console.error("Build failed:", e && e.message ? e.message : e);
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
    const parsed = url.parse(req.url || "/");
    let pathname = decodeURI(parsed.pathname || "/");
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

    // Resolve candidate paths in order:
    // 1) as-is
    // 2) add .html for extensionless
    // 3) if a directory, use its index.html
    let filePath = null;
    const candidateA = path.join(OUT_DIR, pathname);
    const candidateB = path.join(OUT_DIR, pathname + ".html");
    if (fs.existsSync(candidateA)) {
      filePath = candidateA;
    } else if (fs.existsSync(candidateB)) {
      filePath = candidateB;
    }
    if (!filePath) {
      // Try directory index for extensionless or folder routes
      const maybeDir = path.join(OUT_DIR, pathname);
      if (fs.existsSync(maybeDir)) {
        try {
          const st = fs.statSync(maybeDir);
          if (st.isDirectory()) {
            const idx = path.join(maybeDir, "index.html");
            if (fs.existsSync(idx)) filePath = idx;
          }
        } catch (_) {}
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
      "tailwind.config.ts",
    ].map((n) => path.join(root, n));
    const twConfigsApp = [
      "tailwind.config.js",
      "tailwind.config.cjs",
      "tailwind.config.mjs",
      "tailwind.config.ts",
    ].map((n) => path.join(appStylesDir, n));
    let configPath = [...twConfigsApp, ...twConfigsRoot].find((p) => {
      try {
        return fs.existsSync(p);
      } catch (_) {
        return false;
      }
    });
    const inputCandidates = [
      path.join(appStylesDir, "index.css"),
      path.join(CONTENT_DIR, "_styles.css"),
    ];
    let inputCss = inputCandidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch (_) {
        return false;
      }
    });
    // Generate fallback config and input if missing
    if (!configPath) {
      try {
        const { CACHE_DIR } = require("./common");
        const genDir = path.join(CACHE_DIR, "tailwind");
        ensureDirSync(genDir);
        const genCfg = path.join(genDir, "tailwind.config.js");
        const cfg = `module.exports = {\n  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],\n  content: [\n    './content/**/*.{mdx,html}',\n    './site/**/*.html',\n    './site/**/*.js',\n    './packages/app/ui/**/*.{js,jsx,ts,tsx}',\n    './packages/app/lib/iiif/components/**/*.{js,jsx}',\n  ],\n  theme: { extend: {} },\n  plugins: [require('@canopy-iiif/app/ui/canopy-iiif-plugin')],\n};\n`;
        fs.writeFileSync(genCfg, cfg, "utf8");
        configPath = genCfg;
      } catch (_) {
        configPath = null;
      }
    }
    if (!inputCss) {
      try {
        const { CACHE_DIR } = require("./common");
        const genDir = path.join(CACHE_DIR, "tailwind");
        ensureDirSync(genDir);
        const genCss = path.join(genDir, "index.css");
        fs.writeFileSync(
          genCss,
          `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
          "utf8"
        );
        inputCss = genCss;
      } catch (_) {
        inputCss = null;
      }
    }
    const outputCss = path.join(OUT_DIR, "styles", "styles.css");
    if (configPath && inputCss) {
      // Ensure output dir exists and start watcher
      ensureDirSync(path.dirname(outputCss));
      let child = null;
      // Ensure output file exists (fallback minimal CSS if CLI/compile fails)
      function writeFallbackCssIfMissing() {
        try {
          if (!fs.existsSync(outputCss)) {
            const base = `:root{--max-w:760px;--muted:#6b7280}*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;max-width:var(--max-w);margin:2rem auto;padding:0 1rem;line-height:1.6}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}`;
            ensureDirSync(path.dirname(outputCss));
            fs.writeFileSync(outputCss, base + "\n", "utf8");
            console.log(
              "[tailwind] wrote fallback CSS to",
              prettyPath(outputCss)
            );
          }
        } catch (_) {}
      }
      function fileSizeKb(p) {
        try {
          const st = fs.statSync(p);
          return st && st.size ? (st.size / 1024).toFixed(1) : "0.0";
        } catch (_) {
          return "0.0";
        }
      }
      // Initial one-off compile so the CSS exists before watcher starts
      try {
        const cliOnce = resolveTailwindCli();
        if (cliOnce) {
          const { spawnSync } = require("child_process");
          const argsOnce = [
            "-i",
            inputCss,
            "-o",
            outputCss,
            "-c",
            configPath,
            "--minify",
          ];
          const res = spawnSync(cliOnce.cmd, [...cliOnce.args, ...argsOnce], {
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
          });
          if (res && res.status === 0) {
            console.log(
              `[tailwind] initial build ok (${fileSizeKb(outputCss)} KB) →`,
              prettyPath(outputCss)
            );
          } else {
            console.warn("[tailwind] initial build failed; using fallback CSS");
            try {
              if (res && res.stderr) process.stderr.write(res.stderr);
            } catch (_) {}
            writeFallbackCssIfMissing();
          }
        } else {
          console.warn("[tailwind] CLI not found; using fallback CSS");
          writeFallbackCssIfMissing();
        }
      } catch (_) {}
      // Prefer direct CLI spawn so we can mute initial rebuild logs
      const cli = resolveTailwindCli();
      if (cli) {
        const args = [
          "-i",
          inputCss,
          "-o",
          outputCss,
          "--watch",
          "-c",
          configPath,
          "--minify",
        ];
        let unmuted = false;
        let cssWatcherAttached = false;
        function attachCssWatcherOnce() {
          if (cssWatcherAttached) return;
          cssWatcherAttached = true;
          try {
            fs.watch(outputCss, { persistent: false }, () => {
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
          try {
            const { spawnSync } = require("child_process");
            const res = spawnSync(
              cli.cmd,
              [
                ...cli.args,
                "-i",
                inputCss,
                "-o",
                outputCss,
                "-c",
                configPath,
                "--minify",
              ],
              {
                stdio: ["ignore", "pipe", "pipe"],
                env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
              }
            );
            if (res && res.status === 0) {
              console.log(
                `[tailwind] compiled (${fileSizeKb(outputCss)} KB) →`,
                prettyPath(outputCss)
              );
              try {
                onCssChange();
              } catch (_) {}
            } else {
              console.warn("[tailwind] on-demand compile failed");
              try {
                if (res && res.stderr) process.stderr.write(res.stderr);
              } catch (_) {}
            }
          } catch (_) {}
        }
        function startTailwindWatcher() {
          unmuted = false;
          const proc = spawn(cli.cmd, [...cli.args, ...args], {
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
          });
          if (proc.stdout)
            proc.stdout.on("data", (d) => {
              const s = d ? String(d) : "";
              if (!unmuted) {
                if (/error/i.test(s)) {
                  try {
                    process.stdout.write("[tailwind] " + s);
                  } catch (_) {}
                }
              } else {
                try {
                  process.stdout.write(s);
                } catch (_) {}
              }
            });
          if (proc.stderr)
            proc.stderr.on("data", (d) => {
              const s = d ? String(d) : "";
              if (!unmuted) {
                if (s.trim()) {
                  try {
                    process.stderr.write("[tailwind] " + s);
                  } catch (_) {}
                }
              } else {
                try {
                  process.stderr.write(s);
                } catch (_) {}
              }
            });
          proc.on("exit", (code) => {
            // Ignore null exits (expected when we intentionally restart the watcher)
            if (code !== 0 && code !== null) {
              console.error("[tailwind] watcher exited with code", code);
            }
          });
          attachCssWatcherOnce();
          return proc;
        }
        child = startTailwindWatcher();
        // Unmute Tailwind logs after the first successful CSS write
        // Watch UI Tailwind plugin/preset files and restart Tailwind to pick up code changes
        try {
          const uiPlugin = path.join(
            __dirname,
            "../ui",
            "tailwind-canopy-iiif-plugin.js"
          );
          const uiPreset = path.join(
            __dirname,
            "../ui",
            "tailwind-canopy-iiif-preset.js"
          );
          const uiStylesDir = path.join(__dirname, "../ui", "styles");
          const files = [uiPlugin, uiPreset].filter((p) => {
            try {
              return fs.existsSync(p);
            } catch (_) {
              return false;
            }
          });
          let restartTimer = null;
          const restart = () => {
            clearTimeout(restartTimer);
            restartTimer = setTimeout(() => {
              console.log(
                "[tailwind] detected UI plugin/preset change — restarting Tailwind"
              );
              try {
                if (child && !child.killed) child.kill();
              } catch (_) {}
              // Force a compile immediately so new CSS lands before reload
              compileTailwindOnce();
              child = startTailwindWatcher();
              // Notify clients that a rebuild is in progress; CSS watcher will trigger reload on write
              try {
                onBuildStart();
              } catch (_) {}
            }, 50);
          };
          for (const f of files) {
            try {
              fs.watch(f, { persistent: false }, restart);
            } catch (_) {}
          }
          // Watch UI styles directory (Sass partials used by the plugin); restart Tailwind on Sass changes
          try {
            if (fs.existsSync(uiStylesDir)) {
              try {
                fs.watch(
                  uiStylesDir,
                  { persistent: false, recursive: true },
                  (evt, fn) => {
                    try {
                      if (fn && /\.s[ac]ss$/i.test(String(fn))) restart();
                    } catch (_) {}
                  }
                );
              } catch (_) {
                // Fallback: per-dir watch without recursion
                const watchers = new Map();
                const watchDir = (dir) => {
                  if (watchers.has(dir)) return;
                  try {
                    const w = fs.watch(
                      dir,
                      { persistent: false },
                      (evt, fn) => {
                        try {
                          if (fn && /\.s[ac]ss$/i.test(String(fn))) restart();
                        } catch (_) {}
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
          } catch (_) {}
          // Also watch the app Tailwind config; restart Tailwind when it changes
          try {
            if (configPath && fs.existsSync(configPath))
              fs.watch(configPath, { persistent: false }, () => {
                console.log(
                  "[tailwind] tailwind.config change — restarting Tailwind"
                );
                restart();
              });
          } catch (_) {}
          // If the input CSS lives under app/styles, watch the directory for direct edits to CSS/partials
          try {
            const stylesDir = path.dirname(inputCss || "");
            if (stylesDir && stylesDir.includes(path.join("app", "styles"))) {
              let cssDebounce = null;
              fs.watch(stylesDir, { persistent: false }, (evt, fn) => {
                clearTimeout(cssDebounce);
                cssDebounce = setTimeout(() => {
                  try {
                    onBuildStart();
                  } catch (_) {}
                  // Force a compile so changes in index.css or partials are reflected immediately
                  try {
                    compileTailwindOnce();
                  } catch (_) {}
                  try {
                    onCssChange();
                  } catch (_) {}
                }, 50);
              });
            }
          } catch (_) {}
        } catch (_) {}
      } else if (twHelper && typeof twHelper.watchTailwind === "function") {
        // Fallback to helper (cannot mute its initial logs)
        child = twHelper.watchTailwind({
          input: inputCss,
          output: outputCss,
          config: configPath,
          minify: false,
        });
        if (child) {
          console.log("[tailwind] watching", prettyPath(inputCss));
          try {
            fs.watch(outputCss, { persistent: false }, () => {
              try {
                onCssChange();
              } catch (_) {}
            });
          } catch (_) {}
        }
      }
    }
  } catch (_) {}
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
}

module.exports = { dev };

if (require.main === module) dev();
