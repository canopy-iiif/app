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
const iiif = require("./iiif");
const search = require("./search");
const { log, logLine } = require("./log");

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
  const dest = path.join(OUT_DIR, 'styles.css');
  const customContentCss = path.join(CONTENT_DIR, '_styles.css');
  const appStylesDir = path.join(process.cwd(), 'app', 'styles');
  const customAppCss = path.join(appStylesDir, 'index.css');
  ensureDirSync(path.dirname(dest));

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
      const cfg = `module.exports = {\n  presets: [require('@canopy-iiif/ui/tailwind-preset')],\n  content: [\n    './content/**/*.{mdx,html}',\n    './site/**/*.html',\n    './packages/ui/**/*.{js,jsx,ts,tsx}',\n    './packages/lib/components/**/*.{js,jsx}',\n  ],\n  theme: { extend: {} },\n};\n`;
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
  if (configPath && inputCss) {
    try {
      const helper = require('../helpers/build-tailwind');
      const ok = await helper.buildTailwind({ input: inputCss || generatedInput, output: dest, config: configPath, minify: true });
      if (ok) return; // Tailwind compiled CSS
    } catch (_) {
      // fallthrough to copy or default
    }
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
    .relative(path.dirname(outPath), path.join(OUT_DIR, "styles.css"))
    .split(path.sep)
    .join("/");
  const needsHydrate =
    body.includes("data-canopy-hydrate") || body.includes("data-canopy-viewer");
  const jsRel = needsHydrate
    ? path
        .relative(path.dirname(outPath), path.join(OUT_DIR, "canopy-viewer.js"))
        .split(path.sep)
        .join("/")
    : null;
  // Detect pages that require client-side React (flagged by components)
  const needsReact = body.includes('data-react-root') || body.includes('data-canopy-react');
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
  // If hydration needed, include hydration script
  let headExtra = head;
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

async function build() {
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
  await cleanDir(OUT_DIR);
  logLine("✓ Cleaned output directory\n", "cyan");
  await ensureStyles();
  logLine("✓ Wrote styles.css\n", "cyan");
  await mdx.ensureClientRuntime();
  logLine("✓ Prepared client hydration runtime\n", "cyan", { dim: true });
  // Copy assets from assets/ to site/
  await copyAssets();
  // No-op: global layout removed

  // Build IIIF works + collect search records
  const CONFIG = await iiif.loadConfig();
  const { searchRecords } = await iiif.buildIiifCollectionPages(CONFIG);

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
}

module.exports = { build };

if (require.main === module) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
