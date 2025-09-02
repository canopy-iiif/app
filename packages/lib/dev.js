const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');
const { build } = require('./build');
const http = require('http');
const url = require('url');
const { CONTENT_DIR, OUT_DIR, ASSETS_DIR, ensureDirSync } = require('./common');
const PORT = Number(process.env.PORT || 3000);
let onBuildSuccess = () => {};
let onBuildStart = () => {};

async function runBuild() {
  try {
    await build();
    try { onBuildSuccess(); } catch (_) {}
  } catch (e) {
    console.error('Build failed:', e && e.message ? e.message : e);
  }
}

function tryRecursiveWatch() {
  try {
    const watcher = fs.watch(CONTENT_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      console.log(`[watch] ${eventType}: ${filename}`);
      try { onBuildStart(); } catch (_) {}
      debounceBuild();
    });
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
        console.log(`[watch] ${eventType}: ${path.join(dir, filename || '')}`);
        // If a new directory appears, add a watcher for it on next scan
        scan(dir);
        try { onBuildStart(); } catch (_) {}
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
      console.log(`[assets] Copied ${relativePath} -> ${path.relative(process.cwd(), dest)}`);
    } else {
      // Removed or renamed away: remove dest
      try { await fsp.rm(dest, { force: true, recursive: true }); } catch (_) {}
      console.log(`[assets] Removed ${relativePath}`);
    }
  } catch (e) {
    console.warn('[assets] sync failed:', e && e.message ? e.message : e);
  }
}

function tryRecursiveWatchAssets() {
  try {
    const watcher = fs.watch(ASSETS_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      console.log(`[assets] ${eventType}: ${filename}`);
      // Copy just the changed asset and trigger reload
      syncAsset(filename).then(() => { try { onBuildSuccess(); } catch (_) {} });
    });
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
        const rel = filename ? path.relative(ASSETS_DIR, path.join(dir, filename)) : path.relative(ASSETS_DIR, dir);
        console.log(`[assets] ${eventType}: ${path.join(dir, filename || '')}`);
        // If a new directory appears, add a watcher for it on next scan
        scan(dir);
        syncAsset(rel).then(() => { try { onBuildSuccess(); } catch (_) {} });
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function startServer() {
  const clients = new Set();
  function broadcast(type) {
    for (const res of clients) {
      try { res.write(`data: ${type}\n\n`); } catch (_) {}
    }
  }
  onBuildStart = () => broadcast('building');
  onBuildSuccess = () => broadcast('reload');

  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url || '/');
    let pathname = decodeURI(parsed.pathname || '/');
    // Serve dev toast assets and config
    if (pathname === '/__livereload-config') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      const cfgPath = path.join(__dirname, 'devtoast.config.json');
      let cfg = { buildingText: 'Rebuilding…', reloadedText: 'Reloaded', fadeMs: 800, reloadDelayMs: 200 };
      try {
        if (fs.existsSync(cfgPath)) {
          const raw = fs.readFileSync(cfgPath, 'utf8');
          const parsedCfg = JSON.parse(raw);
          cfg = { ...cfg, ...parsedCfg };
        }
      } catch (_) {}
      res.end(JSON.stringify(cfg));
      return;
    }
    if (pathname === '/__livereload.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache' });
      const cssPath = path.join(__dirname, 'devtoast.css');
      let css = `#__lr_toast{position:fixed;bottom:12px;left:12px;background:rgba(0,0,0,.8);color:#fff;padding:6px 10px;border-radius:6px;font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:0;transition:opacity .15s ease}`;
      try {
        if (fs.existsSync(cssPath)) css = fs.readFileSync(cssPath, 'utf8');
      } catch (_) {}
      res.end(css);
      return;
    }
    if (pathname === '/__livereload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      });
      res.write(': connected\n\n');
      clients.add(res);
      const keepAlive = setInterval(() => {
        try { res.write(': ping\n\n'); } catch (_) {}
      }, 30000);
      req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(res);
      });
      return;
    }
    if (pathname === '/') pathname = '/index.html';

    // Try path as-is, falling back to adding .html for extensionless routes
    const candidates = [
      path.join(OUT_DIR, pathname),
      path.join(OUT_DIR, pathname + '.html')
    ];

    let filePath = candidates.find((p) => fs.existsSync(p));
    if (!filePath) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Not Found');
      return;
    }

    // Prevent path traversal by ensuring resolved path stays under SITE_DIR
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(OUT_DIR)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    if (ext === '.html') {
      try {
        let html = fs.readFileSync(resolved, 'utf8');
        const snippet = "\n<link rel=\"stylesheet\" href=\"/__livereload.css\">\n<script>(function(){var t,cfg={buildingText:'Rebuilding…',reloadedText:'Reloaded',fadeMs:800,reloadDelayMs:200};fetch('/__livereload-config').then(function(r){return r.json()}).then(function(j){cfg=j}).catch(function(){});function toast(m){var el=document.getElementById('__lr_toast');if(!el){el=document.createElement('div');el.id='__lr_toast';document.body.appendChild(el);}el.textContent=m;el.style.opacity='1';clearTimeout(t);t=setTimeout(function(){el.style.opacity='0'},cfg.fadeMs);}var es=new EventSource('/__livereload');es.onmessage=function(e){if(e.data==='building'){toast(cfg.buildingText);}else if(e.data==='reload'){toast(cfg.reloadedText);setTimeout(function(){location.reload()},cfg.reloadDelayMs);}};window.addEventListener('beforeunload',function(){try{es.close();}catch(e){}});})();</script>";
        html = html.includes('</body>') ? html.replace('</body>', snippet + '</body>') : html + snippet;
        res.end(html);
      } catch (e) {
        res.statusCode = 500;
        res.end('Error serving HTML');
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

function dev() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('No content directory found at', CONTENT_DIR);
    process.exit(1);
  }
  console.log('Initial build...');
  if (process.env.DEV_ONCE) {
    // Build once and exit (used for tests/CI)
    runBuild().then(() => process.exit(0)).catch(() => process.exit(1));
    return;
  }
  runBuild();
  startServer();
  console.log('Watching', CONTENT_DIR, '(Ctrl+C to stop)');
  const rw = tryRecursiveWatch();
  if (!rw) watchPerDir();
  // Watch assets for live copy without full rebuild
  if (fs.existsSync(ASSETS_DIR)) {
    console.log('Watching', ASSETS_DIR, '(assets live-reload)');
    const arw = tryRecursiveWatchAssets();
    if (!arw) watchAssetsPerDir();
  }
}

module.exports = { dev };

if (require.main === module) dev();
