const {
  fs,
  fsp,
  path,
  CONTENT_DIR,
  OUT_DIR,
  ASSETS_DIR,
  ensureDirSync,
  cleanDir,
  htmlShell,
} = require("./common");
const mdx = require("./mdx");
const slugify = require("slugify");
const iiif = require("./iiif");
const search = require("./search");
const { log, logLine } = require("./log");

// Cache IIIF search records between builds (dev mode) so MDX-only rebuilds
// can skip re-fetching IIIF while still keeping search results for works.
let IIIF_RECORDS_CACHE = [];

let PAGES = [];
const LAYOUT_META = new Map(); // cache: dir -> frontmatter data for _layout.mdx in that dir

async function getNearestLayoutMeta(filePath) {
  const startDir = path.dirname(filePath);
  let dir = startDir;
  while (dir && dir.startsWith(CONTENT_DIR)) {
    const key = path.resolve(dir);
    if (LAYOUT_META.has(key)) {
      const cached = LAYOUT_META.get(key);
      if (cached) return cached;
    }
    const candidate = path.join(dir, "_layout.mdx");
    if (fs.existsSync(candidate)) {
      try {
        const raw = await fsp.readFile(candidate, "utf8");
        const fm = mdx.parseFrontmatter(raw);
        const data = fm && fm.data ? fm.data : null;
        LAYOUT_META.set(key, data);
        if (data) return data;
      } catch (_) {
        LAYOUT_META.set(key, null);
      }
    } else {
      LAYOUT_META.set(key, null);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function mapOutPath(filePath) {
  const rel = path.relative(CONTENT_DIR, filePath);
  const outRel = rel.replace(/\.mdx$/i, ".html");
  return path.join(OUT_DIR, outRel);
}

async function ensureStyles() {
  const stylesDir = path.join(OUT_DIR, 'styles');
  const dest = path.join(stylesDir, 'styles.css');
  const customContentCss = path.join(CONTENT_DIR, '_styles.css');
  const appStylesDir = path.join(process.cwd(), 'app', 'styles');
  const customAppCss = path.join(appStylesDir, 'index.css');
  ensureDirSync(stylesDir);

  // If Tailwind config exists and CLI is available, compile using app/styles or content css
  const root = process.cwd();
  const twConfigsRoot = [
    path.join(root, 'tailwind.config.js'),
    path.join(root, 'tailwind.config.cjs'),
    path.join(root, 'tailwind.config.mjs'),
    path.join(root, 'tailwind.config.ts'),
  ];
  const twConfigsApp = [
    path.join(appStylesDir, 'tailwind.config.js'),
    path.join(appStylesDir, 'tailwind.config.cjs'),
    path.join(appStylesDir, 'tailwind.config.mjs'),
    path.join(appStylesDir, 'tailwind.config.ts'),
  ];
  let configPath = [...twConfigsApp, ...twConfigsRoot].find((p) => {
    try { return fs.existsSync(p); } catch (_) { return false; }
  });
  // If no explicit config, generate a minimal default under .cache
  if (!configPath) {
    try {
      const { CACHE_DIR } = require('./common');
      const genDir = path.join(CACHE_DIR, 'tailwind');
      ensureDirSync(genDir);
      const genCfg = path.join(genDir, 'tailwind.config.js');
      const cfg = `module.exports = {\n  presets: [require('@canopy-iiif/ui/canopy-iiif-preset')],\n  content: [\n    './content/**/*.{mdx,html}',\n    './site/**/*.html',\n    './site/**/*.js',\n    './packages/ui/**/*.{js,jsx,ts,tsx}',\n    './packages/lib/components/**/*.{js,jsx}',\n  ],\n  theme: { extend: {} },\n  plugins: [require('@canopy-iiif/ui/canopy-iiif-plugin')],\n};\n`;
      fs.writeFileSync(genCfg, cfg, 'utf8');
      configPath = genCfg;
    } catch (_) { configPath = null; }
  }
  const inputCss = fs.existsSync(customAppCss)
    ? customAppCss
    : (fs.existsSync(customContentCss) ? customContentCss : null);
  // If no input CSS present, generate a small default in cache
  let generatedInput = null;
  if (!inputCss) {
    try {
      const { CACHE_DIR } = require('./common');
      const genDir = path.join(CACHE_DIR, 'tailwind');
      ensureDirSync(genDir);
      generatedInput = path.join(genDir, 'index.css');
      const css = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
      fs.writeFileSync(generatedInput, css, 'utf8');
    } catch (_) { generatedInput = null; }
  }
  // Local helper to invoke Tailwind CLI without cross-package require
  function resolveTailwindCli() {
    try {
      const cliJs = require.resolve('tailwindcss/lib/cli.js');
      return { cmd: process.execPath, args: [cliJs] };
    } catch (_) {}
    try {
      const localBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
      if (fs.existsSync(localBin)) return { cmd: localBin, args: [] };
    } catch (_) {}
    return null;
  }
  function buildTailwindCli({ input, output, config, minify = true }) {
    try {
      const cli = resolveTailwindCli();
      if (!cli) return false;
      const { spawnSync } = require('child_process');
      const args = ['-i', input, '-o', output];
      if (config) args.push('-c', config);
      if (minify) args.push('--minify');
      const res = spawnSync(cli.cmd, [...cli.args, ...args], { stdio: 'inherit', env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: '1' } });
      return !!res && res.status === 0;
    } catch (_) { return false; }
  }
  if (configPath && (inputCss || generatedInput)) {
    const ok = buildTailwindCli({ input: inputCss || generatedInput, output: dest, config: configPath, minify: true });
    if (ok) return; // Tailwind compiled CSS
  }

  // If a custom CSS exists (non-TW or TW not available), copy it as-is.
  function isTailwindSource(p) {
    try { const s = fs.readFileSync(p, 'utf8'); return /@tailwind\s+(base|components|utilities)/.test(s); } catch (_) { return false; }
  }
  if (fs.existsSync(customAppCss)) {
    if (!isTailwindSource(customAppCss)) {
      await fsp.copyFile(customAppCss, dest);
      return;
    }
  }
  if (fs.existsSync(customContentCss)) {
    if (!isTailwindSource(customContentCss)) {
      await fsp.copyFile(customContentCss, dest);
      return;
    }
  }

  // Default minimal CSS
  const css = `:root{--max-w:760px;--muted:#6b7280}*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;max-width:var(--max-w);margin:2rem auto;padding:0 1rem;line-height:1.6}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}.site-header,.site-footer{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:1rem 0;border-bottom:1px solid #e5e7eb}.site-footer{border-bottom:0;border-top:1px solid #e5e7eb;color:var(--muted)}.brand{font-weight:600}.content pre{background:#f6f8fa;padding:1rem;overflow:auto}.content code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;background:#f6f8fa;padding:.1rem .3rem;border-radius:4px}.tabs{display:flex;gap:.5rem;align-items:center;border-bottom:1px solid #e5e7eb;margin:.5rem 0}.tab{background:none;border:0;color:#374151;padding:.25rem .5rem;border-radius:.375rem;cursor:pointer}.tab:hover{color:#111827}.tab-active{color:#2563eb;border:1px solid #e5e7eb;border-bottom:0;background:#fff}.masonry{column-gap:1rem;column-count:1}@media(min-width:768px){.masonry{column-count:2}}@media(min-width:1024px){.masonry{column-count:3}}.masonry>*{break-inside:avoid;margin-bottom:1rem;display:block}[data-grid-variant=masonry]{column-gap:var(--grid-gap,1rem);column-count:var(--cols-base,1)}@media(min-width:768px){[data-grid-variant=masonry]{column-count:var(--cols-md,2)}}@media(min-width:1024px){[data-grid-variant=masonry]{column-count:var(--cols-lg,3)}}[data-grid-variant=masonry]>*{break-inside:avoid;margin-bottom:var(--grid-gap,1rem);display:block}[data-grid-variant=grid]{display:grid;grid-template-columns:repeat(var(--cols-base,1),minmax(0,1fr));gap:var(--grid-gap,1rem)}@media(min-width:768px){[data-grid-variant=grid]{grid-template-columns:repeat(var(--cols-md,2),minmax(0,1fr))}}@media(min-width:1024px){[data-grid-variant=grid]{grid-template-columns:repeat(var(--cols-lg,3),minmax(0,1fr))}}`;
  await fsp.writeFile(dest, css, 'utf8');
}

async function compileMdxFile(filePath, outPath, extraProps = {}) {
  const source = await fsp.readFile(filePath, "utf8");
  const title = mdx.extractTitle(source);
  const { body, head } = await mdx.compileMdxFile(
    filePath,
    outPath,
    null,
    extraProps
  );
  const cssRel = path
    .relative(path.dirname(outPath), path.join(OUT_DIR, "styles", "styles.css"))
    .split(path.sep)
    .join("/");
  const needsHydrateViewer = body.includes('data-canopy-viewer');
  const needsHydrateSlider = body.includes('data-canopy-slider');
  // Command palette is globally available in the App; include its runtime unconditionally
  const needsCommand = true;
  // Detect both legacy and new placeholders
  const needsFacets = body.includes('data-canopy-related-items');
  const needsHydrate = body.includes('data-canopy-hydrate') || needsHydrateViewer || needsHydrateSlider || needsFacets || needsCommand;
  const viewerRel = needsHydrateViewer
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-viewer.js')).split(path.sep).join('/')
    : null;
  const sliderRel = (needsHydrateSlider || needsFacets)
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-slider.js')).split(path.sep).join('/')
    : null;
  const facetsRel = needsFacets
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-related-items.js')).split(path.sep).join('/')
    : null;
  const commandRel = needsCommand
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-command.js')).split(path.sep).join('/')
    : null;
  // Ensure facets runs before slider: make slider the main script so it executes last
  let jsRel = null;
  if (needsFacets && sliderRel) jsRel = sliderRel;
  else if (viewerRel) jsRel = viewerRel;
  else if (sliderRel) jsRel = sliderRel;
  else if (facetsRel) jsRel = facetsRel;
  // Detect pages that require client-side React (viewer/slider/related items)
  const needsReact = !!(needsHydrateViewer || needsHydrateSlider || needsFacets);
  let vendorTag = '';
  if (needsReact) {
    try {
      await mdx.ensureReactGlobals();
      const vendorAbs = path.join(OUT_DIR, 'scripts', 'react-globals.js');
      let vendorRel = path.relative(path.dirname(outPath), vendorAbs).split(path.sep).join('/');
      try { const stv = fs.statSync(vendorAbs); vendorRel += `?v=${Math.floor(stv.mtimeMs || Date.now())}`; } catch (_) {}
      vendorTag = `<script src="${vendorRel}"></script>`;
    } catch (_) {}
  }
  // Expose CANOPY_BASE_PATH to the browser for runtime fetch/link building
  try {
    const { BASE_PATH } = require('./common');
    if (BASE_PATH) vendorTag = `<script>window.CANOPY_BASE_PATH=${JSON.stringify(BASE_PATH)}</script>` + vendorTag;
  } catch (_) {}
  // If hydration needed, include hydration script
  let headExtra = head;
  const extraScripts = [];
  // Load facets before slider so placeholders exist
  if (facetsRel && jsRel !== facetsRel) extraScripts.push(`<script defer src="${facetsRel}"></script>`);
  if (viewerRel && jsRel !== viewerRel) extraScripts.push(`<script defer src="${viewerRel}"></script>`);
  if (sliderRel && jsRel !== sliderRel) extraScripts.push(`<script defer src="${sliderRel}"></script>`);
  if (commandRel && jsRel !== commandRel) extraScripts.push(`<script defer src="${commandRel}"></script>`);
  if (extraScripts.length) headExtra = extraScripts.join('') + headExtra;
  const bodyWithScript = body;
  const html = htmlShell({
    title,
    body: bodyWithScript,
    cssHref: cssRel || "styles.css",
    scriptHref: jsRel,
    headExtra: vendorTag + headExtra,
  });
  const { applyBaseToHtml } = require("./common");
  return applyBaseToHtml(html);
}

async function processEntry(absPath) {
  const stat = await fsp.stat(absPath);
  if (stat.isDirectory()) return;
  if (/\.mdx$/i.test(absPath)) {
    if (mdx.isReservedFile(absPath)) return;
    const outPath = mapOutPath(absPath);
    ensureDirSync(path.dirname(outPath));
    try {
      try {
        log(`• Processing MDX ${absPath}\n`, "blue");
      } catch (_) {}
      const base = path.basename(absPath);
      const extra =
        base.toLowerCase() === "sitemap.mdx" ? { pages: PAGES } : {};
      const html = await compileMdxFile(absPath, outPath, extra);
      await fsp.writeFile(outPath, html || "", "utf8");
      try {
        log(`✓ Built ${path.relative(process.cwd(), outPath)}\n`, "green");
      } catch (_) {}
    } catch (err) {
      console.error("MDX build failed for", absPath, "\n", err.message);
    }
  } else {
    const rel = path.relative(CONTENT_DIR, absPath);
    const outPath = path.join(OUT_DIR, rel);
    ensureDirSync(path.dirname(outPath));
    await fsp.copyFile(absPath, outPath);
    try {
      log(`• Copied ${path.relative(process.cwd(), outPath)}\n`, "cyan", {
        dim: true,
      });
    } catch (_) {}
  }
}

async function walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.isFile()) await processEntry(p);
  }
}

async function copyAssets() {
  try {
    if (!fs.existsSync(ASSETS_DIR)) return;
  } catch (_) {
    return;
  }
  async function walkAssets(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const src = path.join(dir, e.name);
      const rel = path.relative(ASSETS_DIR, src);
      const dest = path.join(OUT_DIR, rel);
      if (e.isDirectory()) {
        ensureDirSync(dest);
        await walkAssets(src);
      } else if (e.isFile()) {
        ensureDirSync(path.dirname(dest));
        await fsp.copyFile(src, dest);
        try {
          log(`• Asset ${path.relative(process.cwd(), dest)}\n`, "cyan", {
            dim: true,
          });
        } catch (_) {}
      }
    }
  }
  try {
    logLine("• Copying assets...", "blue", { bright: true });
  } catch (_) {}
  await walkAssets(ASSETS_DIR);
  try {
    logLine("✓ Assets copied\n", "green");
  } catch (_) {}
}

// No global default layout; directory-scoped layouts are resolved per-page

async function build(options = {}) {
  const opt = options || {};
  const skipIiif = !!opt.skipIiif;
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("No content directory found at", CONTENT_DIR);
    process.exit(1);
  }
  // Reset MDX and layout metadata caches for accurate dev rebuilds
  try {
    if (mdx && typeof mdx.resetMdxCaches === "function") mdx.resetMdxCaches();
  } catch (_) {}
  try {
    if (
      typeof LAYOUT_META !== "undefined" &&
      LAYOUT_META &&
      typeof LAYOUT_META.clear === "function"
    )
      LAYOUT_META.clear();
  } catch (_) {}
  if (!skipIiif) {
    await cleanDir(OUT_DIR);
    logLine("✓ Cleaned output directory\n", "cyan");
  } else {
    try { logLine("• Incremental rebuild (skip IIIF, no clean)\n", "blue"); } catch (_) {}
  }
  // Defer styles until after pages are generated so Tailwind can scan site HTML
  await mdx.ensureClientRuntime();
  try { if (typeof mdx.ensureSliderRuntime === 'function') await mdx.ensureSliderRuntime(); } catch (_) {}
  try { if (typeof mdx.ensureFacetsRuntime === 'function') await mdx.ensureFacetsRuntime(); } catch (_) {}
  try { if (typeof mdx.ensureCommandRuntime === 'function') await mdx.ensureCommandRuntime(); } catch (_) {}
  try { if (typeof mdx.ensureReactGlobals === 'function') await mdx.ensureReactGlobals(); } catch (_) {}
  // Always use lightweight command runtime to keep payload small
  try {
    const cmdOut = path.join(OUT_DIR, 'scripts', 'canopy-command.js');
    ensureDirSync(path.dirname(cmdOut));
    {
      const fallback = `
      (function(){
        function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
        function parseProps(el){ try{ const s = el.querySelector('script[type="application/json"]'); if(s) return JSON.parse(s.textContent||'{}'); }catch(_){ } return {}; }
        function norm(s){ try{ return String(s||'').toLowerCase(); }catch(_){ return ''; } }
        function withBase(href){ try{ var bp = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : ''; if(!bp) return href; if(/^https?:/i.test(href)) return href; var clean = href.replace(/^\\/+/, ''); return (bp.endsWith('/') ? bp.slice(0,-1) : bp) + '/' + clean; } catch(_){ return href; } }
        function rootBase(){ try { var bp = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : ''; return bp && bp.endsWith('/') ? bp.slice(0,-1) : bp; } catch(_) { return ''; } }
        function createUI(){ var root=document.createElement('div'); root.setAttribute('data-canopy-command-fallback',''); root.style.cssText='position:fixed;inset:0;display:none;align-items:flex-start;justify-content:center;background:rgba(0,0,0,0.3);z-index:9999;padding-top:10vh;'; root.innerHTML='<div style="position:relative;background:#fff;min-width:320px;max-width:720px;width:90%;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.2);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif"><button id="cpclose" aria-label="Close" style="position:absolute;top:8px;right:8px;border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:2px 6px;cursor:pointer">&times;</button><div style="padding:10px 12px;border-bottom:1px solid #e5e7eb"><input id="cpq" type="text" placeholder="Search…" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;outline:none"/></div><div id="cplist" style="max-height:50vh;overflow:auto;padding:6px 0"></div></div>'; document.body.appendChild(root); return root; }
        async function loadRecords(){ try{ var v=''; try{ var m = await fetch(rootBase() + '/api/index.json').then(function(r){return r&&r.ok?r.json():null;}).catch(function(){return null;}); v=(m&&m.version)||''; }catch(_){} var res = await fetch(rootBase() + '/api/search-index.json' + (v?('?v='+encodeURIComponent(v)):'')).catch(function(){return null;}); var j = res && res.ok ? await res.json().catch(function(){return[];}) : []; return Array.isArray(j) ? j : (j && j.records) || []; } catch(_){ return []; } }
        ready(async function(){ var host=document.querySelector('[data-canopy-command]'); if(!host) return; var cfg=parseProps(host)||{}; var maxResults = Number(cfg.maxResults||8)||8; var groupOrder = Array.isArray(cfg.groupOrder)?cfg.groupOrder:['work','page']; var overlay=createUI(); var input=overlay.querySelector('#cpq'); var list=overlay.querySelector('#cplist'); var btnClose=overlay.querySelector('#cpclose'); var records = await loadRecords(); function render(items){ list.innerHTML=''; if(!items.length){ list.innerHTML='<div style="padding:10px 12px;color:#6b7280">No results found.</div>'; return; } var groups=new Map(); items.forEach(function(r){ var t=String(r.type||'page'); if(!groups.has(t)) groups.set(t, []); groups.get(t).push(r); }); function gl(t){ if(t==='work') return 'Works'; if(t==='page') return 'Pages'; return t.charAt(0).toUpperCase()+t.slice(1);} var ordered=[].concat(groupOrder.filter(function(t){return groups.has(t);})).concat(Array.from(groups.keys()).filter(function(t){return groupOrder.indexOf(t)===-1;})); ordered.forEach(function(t){ var hdr=document.createElement('div'); hdr.textContent=gl(t); hdr.style.cssText='padding:6px 12px;font-weight:600;color:#374151'; list.appendChild(hdr); groups.get(t).forEach(function(r){ var it=document.createElement('div'); it.tabIndex=0; it.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer'; var thumb=(String(r.type||'')==='work' && r.thumbnail)?r.thumbnail:''; if(thumb){ var img=document.createElement('img'); img.src=thumb; img.alt=''; img.style.cssText='width:40px;height:40px;object-fit:cover;border-radius:4px'; it.appendChild(img);} var span=document.createElement('span'); span.textContent=r.title||r.href; it.appendChild(span); it.onmouseenter=function(){ it.style.background=\"#f3f4f6\"; }; it.onmouseleave=function(){ it.style.background=\"#fff\"; }; it.onclick=function(){ window.location.href = withBase(String(r.href||'')); }; list.appendChild(it); }); }); }
          function filterAndShow(q){ var qq=norm(q); if(!qq){ list.innerHTML='<div style="padding:10px 12px;color:#6b7280">Type to search…</div>'; return; } var out=[]; for(var i=0;i<records.length;i++){ var r=records[i]; var t=String(r.title||''); if(t && norm(t).includes(qq)) out.push(r); if(out.length>=maxResults) break; } render(out); }
          document.addEventListener('keydown', function(e){ var hk=String(cfg.hotkey||'mod+k').toLowerCase(); var isMod=hk.indexOf('mod+')!==-1; var key=hk.split('+').pop(); if ((isMod ? (e.metaKey||e.ctrlKey) : true) && e.key.toLowerCase()===String(key||'k')){ e.preventDefault(); overlay.style.display='flex'; input.focus(); filterAndShow(input.value||''); } if(e.key==='Escape' && overlay.style.display!=='none'){ e.preventDefault(); overlay.style.display='none'; }});
          overlay.addEventListener('click', function(e){ if(e.target===overlay){ overlay.style.display='none'; }});
          input.addEventListener('input', function(){ filterAndShow(input.value||''); });
          if (btnClose) { btnClose.addEventListener('click', function(){ overlay.style.display='none'; }); }
          var btn = document.querySelector('[data-canopy-command-trigger]'); if(btn){ btn.addEventListener('click', function(){ overlay.style.display='flex'; input.focus(); filterAndShow(input.value||''); }); }
        });
      })();
      `;
      await fsp.writeFile(cmdOut, fallback, 'utf8');
      try { logLine(`✓ Wrote ${path.relative(process.cwd(), cmdOut)} (fallback)`, 'cyan'); } catch (_) {}
    }
  } catch (_) {}
  logLine("✓ Prepared client hydration runtimes\n", "cyan", { dim: true });
  // Copy assets from assets/ to site/
  await copyAssets();
  // No-op: global layout removed

  // Build IIIF works + collect search records (or reuse cache in incremental mode)
  let searchRecords = [];
  if (!skipIiif) {
    const CONFIG = await iiif.loadConfig();
    const res = await iiif.buildIiifCollectionPages(CONFIG);
    searchRecords = Array.isArray(res && res.searchRecords) ? res.searchRecords : [];
    IIIF_RECORDS_CACHE = searchRecords;
  } else {
    searchRecords = Array.isArray(IIIF_RECORDS_CACHE) ? IIIF_RECORDS_CACHE : [];
  }

  // Collect pages metadata for sitemap injection
  const pages = [];
  async function collect(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await collect(p);
      else if (e.isFile() && /\.mdx$/i.test(p) && !mdx.isReservedFile(p)) {
        const base = path.basename(p).toLowerCase();
        const src = await fsp.readFile(p, "utf8");
        const fm = mdx.parseFrontmatter(src);
        const title = mdx.extractTitle(src);
        const rel = path.relative(CONTENT_DIR, p).replace(/\.mdx$/i, ".html");
        if (base !== "sitemap.mdx") {
          // Determine search inclusion/type via frontmatter on page and nearest directory layout
          const href = rel.split(path.sep).join("/");
          const underSearch =
            /^search\//i.test(href) || href.toLowerCase() === "search.html";
          let include = !underSearch;
          let resolvedType = null;
          const pageFm = fm && fm.data ? fm.data : null;
          if (pageFm) {
            if (pageFm.search === false) include = false;
            if (Object.prototype.hasOwnProperty.call(pageFm, "type")) {
              if (pageFm.type) resolvedType = String(pageFm.type);
              else include = false; // explicit empty/null type excludes
            } else {
              // Frontmatter present but no type => exclude per policy
              include = false;
            }
          }
          if (include && !resolvedType) {
            // Inherit from nearest _layout.mdx frontmatter if available
            const layoutMeta = await getNearestLayoutMeta(p);
            if (layoutMeta && layoutMeta.type)
              resolvedType = String(layoutMeta.type);
          }
          if (include && !resolvedType) {
            // No page/layout frontmatter; default generic page
            if (!pageFm) resolvedType = "page";
          }
          pages.push({
            title,
            href,
            searchInclude: include && !!resolvedType,
            searchType: resolvedType || undefined,
          });
        }
      }
    }
  }
  await collect(CONTENT_DIR);
  PAGES = pages;
  // Build all MDX and assets
  logLine("\n• Building MDX pages...", "blue", { bright: true });
  await walk(CONTENT_DIR);
  logLine("✓ MDX pages built\n", "green");

  // Ensure search artifacts
  try {
    const searchPath = path.join(OUT_DIR, "search.html");
    const needCreatePage = !fs.existsSync(searchPath);
    if (needCreatePage) {
      try {
        logLine("• Preparing search (initial)...", "blue", { bright: true });
      } catch (_) {}
      // Build result item template (if present) up-front so it can be inlined
      try { await search.ensureResultTemplate(); } catch (_) {}
      try {
        logLine("  - Writing empty index...", "blue");
      } catch (_) {}
      await search.writeSearchIndex([]);
      try { logLine("  - Writing runtime...", "blue"); } catch (_) {}
      {
        const timeoutMs = Number(process.env.CANOPY_BUNDLE_TIMEOUT || 10000);
        let timedOut = false;
        await Promise.race([
          search.ensureSearchRuntime(),
          new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs))
        ]).catch(() => {
          try { console.warn('Search: Bundling runtime timed out (initial), continuing'); } catch (_) {}
        });
        if (timedOut) {
          try { logLine('! Search runtime skipped (initial timeout)\n', 'yellow'); } catch (_) {}
        }
      }
      try {
        logLine("  - Building search.html...", "blue");
      } catch (_) {}
      await search.buildSearchPage();
      logLine("✓ Created search page", "cyan");
    }
    // Always (re)write the search index combining IIIF and MDX pages
    let mdxRecords = (PAGES || [])
      .filter((p) => p && p.href && p.searchInclude)
      .map((p) => ({
        title: p.title || p.href,
        href: p.href,
        type: p.searchType || "page",
      }));
    const iiifRecords = Array.isArray(searchRecords) ? searchRecords : [];
    let combined = [...iiifRecords, ...mdxRecords];
    // Optional: generate a mock search index for testing (no network needed)
    if (process.env.CANOPY_MOCK_SEARCH === '1') {
      const mock = [];
      const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#dbeafe"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="#1d4ed8">Mock</text></svg>');
      const thumb = `data:image/svg+xml;charset=utf-8,${svg}`;
      for (let i = 1; i <= 120; i++) {
        mock.push({ title: `Mock Work #${i}`, href: `works/mock-${i}.html`, type: 'work', thumbnail: thumb });
      }
      mock.push({ title: 'Mock Doc A', href: 'getting-started/index.html', type: 'docs' });
      mock.push({ title: 'Mock Doc B', href: 'getting-started/example.html', type: 'docs' });
      mock.push({ title: 'Mock Page', href: 'index.html', type: 'page' });
      combined = mock;
    }
    try {
      logLine(`• Updating search index (${combined.length})...`, "blue");
    } catch (_) {}
    await search.writeSearchIndex(combined);
    // Build facets for IIIF works based on configured metadata labels
    try {
      const { loadConfig } = require('./iiif');
      const cfg = await loadConfig();
      const labels = Array.isArray(cfg && cfg.metadata) ? cfg.metadata : [];
      await buildFacetsForWorks(combined, labels);
      await writeFacetCollections(labels, combined);
      await writeFacetsSearchApi();
    } catch (_) {}
    try { logLine("• Writing search runtime (final)...", "blue", { bright: true }); } catch (_) {}
    {
      const timeoutMs = Number(process.env.CANOPY_BUNDLE_TIMEOUT || 10000);
      let timedOut = false;
      await Promise.race([
        search.ensureSearchRuntime(),
        new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs))
      ]).catch(() => {
        try { console.warn('Search: Bundling runtime timed out (final), skipping'); } catch (_) {}
      });
      if (timedOut) {
        try { logLine('! Search runtime not bundled (final timeout)\n', 'yellow'); } catch (_) {}
      }
    }
    // Rebuild result item template after content processing to capture latest
    try { await search.ensureResultTemplate(); } catch (_) {}
    // Rebuild search.html to inline the latest result template
    try { logLine('• Updating search.html...', 'blue'); } catch (_) {}
    await search.buildSearchPage();
    try { logLine('✓ Search page updated', 'cyan'); } catch (_) {}
    // Itemize counts by type for a clearer summary
    const counts = new Map();
    for (const r of combined) {
      const t = String((r && r.type) || "page").toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const parts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t, n]) => `${t}: ${n}`);
    const breakdown = parts.length ? `: ${parts.join(", ")}` : "";
    logLine(
      `✓ Search index: ${combined.length} total records${breakdown}\n`,
      "cyan"
    );
  } catch (_) {}

  // Now that HTML/JS artifacts exist (including search.js), build styles so Tailwind can
  // pick up classes from generated output and runtime bundles.
  if (!process.env.CANOPY_SKIP_STYLES) {
    await ensureStyles();
    logLine("✓ Wrote styles.css\n", "cyan");
  }
}

module.exports = { build };

if (require.main === module) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
// After building search and pages, write styles so Tailwind can scan generated assets

// Helpers for facets
function firstI18nString(x) {
  if (!x) return '';
  if (typeof x === 'string') return x;
  try {
    const keys = Object.keys(x || {});
    if (!keys.length) return '';
    const arr = x[keys[0]];
    if (Array.isArray(arr) && arr.length) return String(arr[0]);
  } catch (_) {}
  return '';
}

async function buildFacetsForWorks(combined, labelWhitelist) {
  const { fs, fsp, path, ensureDirSync } = require('./common');
  const facetsDir = path.resolve('.cache/iiif');
  ensureDirSync(facetsDir);
  const map = new Map(); // label -> Map(value -> Set(docIdx))
  const labels = Array.isArray(labelWhitelist) ? labelWhitelist.map(String) : [];
  if (!Array.isArray(combined)) combined = [];
  for (let i = 0; i < combined.length; i++) {
    const rec = combined[i];
    if (!rec || String(rec.type) !== 'work') continue;
    const href = String(rec.href || '');
    const m = href.match(/^works\/(.+)\.html$/i);
    if (!m) continue;
    const slug = m[1];
    const p = path.resolve('.cache/iiif/manifests', slug + '.json');
    if (!fs.existsSync(p)) continue;
    let manifest = null;
    try { manifest = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { manifest = null; }
    const meta = Array.isArray(manifest && manifest.metadata) ? manifest.metadata : [];
    for (const entry of meta) {
      if (!entry) continue;
      const label = firstI18nString(entry.label);
      const valueRaw = entry.value && (typeof entry.value === 'string' ? entry.value : firstI18nString(entry.value));
      if (!label || !valueRaw) continue;
      if (labels.length && !labels.includes(label)) continue; // only configured labels
      const values = [];
      try {
        if (typeof entry.value === 'string') values.push(entry.value);
        else {
          const obj = entry.value || {};
          for (const k of Object.keys(obj)) {
            const arr = Array.isArray(obj[k]) ? obj[k] : [];
            for (const v of arr) if (v) values.push(String(v));
          }
        }
      } catch (_) { values.push(valueRaw); }
      if (!map.has(label)) map.set(label, new Map());
      const vmap = map.get(label);
      for (const v of values) {
        const key = String(v);
        if (!vmap.has(key)) vmap.set(key, new Set());
        vmap.get(key).add(i); // doc index in combined
      }
    }
  }
  const out = [];
  for (const [label, vmap] of map.entries()) {
    const labelSlug = slugify(label || 'label', { lower: true, strict: true, trim: true });
    const values = [];
    for (const [value, set] of vmap.entries()) {
      const docs = Array.from(set.values()).sort((a, b) => a - b);
      values.push({
        value,
        slug: slugify(value || 'value', { lower: true, strict: true, trim: true }),
        doc_count: docs.length,
        docs,
      });
    }
    // sort values by doc_count desc then alpha
    values.sort((a, b) => b.doc_count - a.doc_count || String(a.value).localeCompare(String(b.value)));
    out.push({ label, slug: labelSlug, values });
  }
  // stable sort labels alpha
  out.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  const dest = path.join(facetsDir, 'facets.json');
  await fsp.writeFile(dest, JSON.stringify(out, null, 2), 'utf8');
}

async function writeFacetCollections(labelWhitelist, combined) {
  const { fs, fsp, path, OUT_DIR, ensureDirSync, absoluteUrl, withBase } = require('./common');
  const facetsPath = path.resolve('.cache/iiif/facets.json');
  if (!fs.existsSync(facetsPath)) return;
  let facets = [];
  try { facets = JSON.parse(fs.readFileSync(facetsPath, 'utf8')) || []; } catch (_) { facets = []; }
  const labels = new Set((Array.isArray(labelWhitelist) ? labelWhitelist : []).map(String));
  const apiRoot = path.join(OUT_DIR, 'api');
  const facetRoot = path.join(apiRoot, 'facet');
  ensureDirSync(facetRoot);
  const list = (Array.isArray(facets) ? facets : []).filter((f) => !labels.size || labels.has(String(f && f.label)));
  const labelIndexItems = [];
  for (const f of list) {
    if (!f || !f.label || !Array.isArray(f.values)) continue;
    const label = String(f.label);
    const labelSlug = slugify(label || 'label', { lower: true, strict: true, trim: true });
    const labelDir = path.join(facetRoot, labelSlug);
    ensureDirSync(labelDir);
    // Child value collections
    for (const v of f.values) {
      if (!v || typeof v !== 'object') continue;
      const value = String(v.value || '');
      const valueSlug = slugify(value || 'value', { lower: true, strict: true, trim: true });
      const dest = path.join(labelDir, valueSlug + '.json');
      const docIdxs = Array.isArray(v.docs) ? v.docs : [];
      const items = [];
      for (const idx of docIdxs) {
        const rec = combined && Array.isArray(combined) ? combined[idx] : null;
        if (!rec || String(rec.type) !== 'work') continue;
        const id = String(rec.id || '');
        const title = String(rec.title || rec.href || '');
        const thumb = String(rec.thumbnail || '');
        const href = String(rec.href || '');
        const homepageId = absoluteUrl('/' + href.replace(/^\/?/, ''));
        const item = {
          id,
          type: 'Manifest',
          label: { none: [title] },
        };
        if (thumb) item.thumbnail = [{ id: thumb, type: 'Image' }];
        item.homepage = [{ id: homepageId, type: 'Text', label: { none: [title] } }];
        items.push(item);
      }
      const selfId = absoluteUrl(`/api/facet/${labelSlug}/${valueSlug}.json`);
      const parentId = absoluteUrl(`/api/facet/${labelSlug}.json`);
      const homepage = absoluteUrl(`/search?${encodeURIComponent(labelSlug)}=${encodeURIComponent(valueSlug)}`);
      const col = {
        '@context': 'https://iiif.io/api/presentation/3/context.json',
        id: selfId,
        type: 'Collection',
        label: { none: [value] },
        items,
        partOf: [{ id: parentId, type: 'Collection' }],
        summary: { none: [label] },
        homepage: [{ id: homepage, type: 'Text', label: { none: [value] } }],
      };
      await fsp.writeFile(dest, JSON.stringify(col, null, 2), 'utf8');
    }
    // Label-level collection
    const labelIndexDest = path.join(facetRoot, labelSlug + '.json');
    const labelItems = (f.values || []).map((v) => {
      const value = String(v && v.value || '');
      const valueSlug = slugify(value || 'value', { lower: true, strict: true, trim: true });
      return {
        id: absoluteUrl(`/api/facet/${labelSlug}/${valueSlug}.json`),
        type: 'Collection',
        label: { none: [value] },
        summary: { none: [label] },
      };
    });
    const labelIndex = {
      '@context': 'https://iiif.io/api/presentation/3/context.json',
      id: absoluteUrl(`/api/facet/${labelSlug}.json`),
      type: 'Collection',
      label: { none: [label] },
      items: labelItems,
    };
    await fsp.writeFile(labelIndexDest, JSON.stringify(labelIndex, null, 2), 'utf8');
    // Add to top-level facets index
    labelIndexItems.push({ id: absoluteUrl(`/api/facet/${labelSlug}.json`), type: 'Collection', label: { none: [label] } });
  }
  // Write top-level facets index
  const facetIndex = {
    '@context': 'https://iiif.io/api/presentation/3/context.json',
    id: absoluteUrl('/api/facet/index.json'),
    type: 'Collection',
    label: { none: ['Facets'] },
    items: labelIndexItems,
  };
  await fsp.writeFile(path.join(facetRoot, 'index.json'), JSON.stringify(facetIndex, null, 2), 'utf8');
}

async function writeFacetsSearchApi() {
  const { fs, fsp, path, OUT_DIR, ensureDirSync } = require('./common');
  const src = path.resolve('.cache/iiif/facets.json');
  if (!fs.existsSync(src)) return;
  let data = null;
  try { data = JSON.parse(fs.readFileSync(src, 'utf8')); } catch (_) { data = null; }
  if (!data) return;
  const destDir = path.join(OUT_DIR, 'api', 'search');
  ensureDirSync(destDir);
  const dest = path.join(destDir, 'facets.json');
  await fsp.writeFile(dest, JSON.stringify(data, null, 2), 'utf8');
}
