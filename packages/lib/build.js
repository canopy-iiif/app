const { fs, fsp, path, CONTENT_DIR, OUT_DIR, ASSETS_DIR, ensureDirSync, cleanDir, htmlShell } = require('./common');
const mdx = require('./mdx');
const iiif = require('./iiif');
const search = require('./search');
const { log, logLine } = require('./log');

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
    const candidate = path.join(dir, '_layout.mdx');
    if (fs.existsSync(candidate)) {
      try {
        const raw = await fsp.readFile(candidate, 'utf8');
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
  const outRel = rel.replace(/\.mdx$/i, '.html');
  return path.join(OUT_DIR, outRel);
}

async function ensureStyles() {
  const dest = path.join(OUT_DIR, 'styles.css');
  const custom = path.join(CONTENT_DIR, '_styles.css');
  ensureDirSync(path.dirname(dest));
  if (fs.existsSync(custom)) {
    await fsp.copyFile(custom, dest);
    return;
  }
  const css = `:root{--max-w:760px;--muted:#6b7280}*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;max-width:var(--max-w);margin:2rem auto;padding:0 1rem;line-height:1.6}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}.site-header,.site-footer{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:1rem 0;border-bottom:1px solid #e5e7eb}.site-footer{border-bottom:0;border-top:1px solid #e5e7eb;color:var(--muted)}.brand{font-weight:600}.content pre{background:#f6f8fa;padding:1rem;overflow:auto}.content code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;background:#f6f8fa;padding:.1rem .3rem;border-radius:4px}`;
  await fsp.writeFile(dest, css, 'utf8');
}

async function compileMdxFile(filePath, outPath, extraProps = {}) {
  const source = await fsp.readFile(filePath, 'utf8');
  const title = mdx.extractTitle(source);
  const { body, head } = await mdx.compileMdxFile(filePath, outPath, null, extraProps);
  const cssRel = path.relative(path.dirname(outPath), path.join(OUT_DIR, 'styles.css')).split(path.sep).join('/');
  const needsHydrate = body.includes('data-canopy-hydrate') || body.includes('data-canopy-viewer');
  const jsRel = needsHydrate
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'canopy-viewer.js')).split(path.sep).join('/')
    : null;
  const html = htmlShell({ title, body, cssHref: cssRel || 'styles.css', scriptHref: jsRel, headExtra: head });
  const { applyBaseToHtml } = require('./common');
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
      try { log(`• Processing MDX ${absPath}\n`, 'blue'); } catch (_) {}
      const base = path.basename(absPath);
      const extra = base.toLowerCase() === 'sitemap.mdx' ? { pages: PAGES } : {};
      const html = await compileMdxFile(absPath, outPath, extra);
      await fsp.writeFile(outPath, html || '', 'utf8');
      try { log(`✓ Built ${path.relative(process.cwd(), outPath)}\n`, 'green'); } catch (_) {}
    } catch (err) {
      console.error('MDX build failed for', absPath, '\n', err.message);
    }
  } else {
    const rel = path.relative(CONTENT_DIR, absPath);
    const outPath = path.join(OUT_DIR, rel);
    ensureDirSync(path.dirname(outPath));
    await fsp.copyFile(absPath, outPath);
    try { log(`• Copied ${path.relative(process.cwd(), outPath)}\n`, 'cyan', { dim: true }); } catch (_) {}
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
  } catch (_) { return; }
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
        try { log(`• Asset ${path.relative(process.cwd(), dest)}\n`, 'cyan', { dim: true }); } catch (_) {}
      }
    }
  }
  try { logLine('• Copying assets...', 'blue', { bright: true }); } catch (_) {}
  await walkAssets(ASSETS_DIR);
  try { logLine('✓ Assets copied\n', 'green'); } catch (_) {}
}

// No global default layout; directory-scoped layouts are resolved per-page

async function build() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('No content directory found at', CONTENT_DIR);
    process.exit(1);
  }
  // Reset MDX and layout metadata caches for accurate dev rebuilds
  try { if (mdx && typeof mdx.resetMdxCaches === 'function') mdx.resetMdxCaches(); } catch (_) {}
  try { if (typeof LAYOUT_META !== 'undefined' && LAYOUT_META && typeof LAYOUT_META.clear === 'function') LAYOUT_META.clear(); } catch (_) {}
  await cleanDir(OUT_DIR);
  logLine('✓ Cleaned output directory\n', 'cyan');
  await ensureStyles();
  logLine('✓ Wrote styles.css\n', 'cyan');
  await mdx.ensureClientRuntime();
  logLine('✓ Prepared client hydration runtime\n', 'cyan', { dim: true });
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
        const src = await fsp.readFile(p, 'utf8');
        const fm = mdx.parseFrontmatter(src);
        const title = mdx.extractTitle(src);
        const rel = path.relative(CONTENT_DIR, p).replace(/\.mdx$/i, '.html');
        if (base !== 'sitemap.mdx') {
          // Determine search inclusion/type via frontmatter on page and nearest directory layout
          const href = rel.split(path.sep).join('/');
          const underSearch = /^search\//i.test(href) || href.toLowerCase() === 'search.html';
          let include = !underSearch;
          let resolvedType = null;
          const pageFm = fm && fm.data ? fm.data : null;
          if (pageFm) {
            if (pageFm.search === false) include = false;
            if (Object.prototype.hasOwnProperty.call(pageFm, 'type')) {
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
            if (layoutMeta && layoutMeta.type) resolvedType = String(layoutMeta.type);
          }
          if (include && !resolvedType) {
            // No page/layout frontmatter; default generic page
            if (!pageFm) resolvedType = 'page';
          }
          pages.push({ title, href, searchInclude: include && !!resolvedType, searchType: resolvedType || undefined });
        }
      }
    }
  }
  await collect(CONTENT_DIR);
  PAGES = pages;
  // Build all MDX and assets
  logLine('• Building MDX pages...', 'blue', { bright: true });
  await walk(CONTENT_DIR);
  logLine('✓ MDX pages built\n', 'green');

  // Ensure search artifacts
  try {
    const searchPath = path.join(OUT_DIR, 'search.html');
    const needCreatePage = !fs.existsSync(searchPath);
    if (needCreatePage) {
      await search.writeSearchIndex([]);
      await search.ensureSearchRuntime();
      await search.buildSearchPage();
      logLine('✓ Created search page', 'cyan');
    }
    // Always (re)write the search index combining IIIF and MDX pages
    const mdxRecords = (PAGES || [])
      .filter((p) => p && p.href && p.searchInclude)
      .map((p) => ({ title: p.title || p.href, href: p.href, type: p.searchType || 'page' }));
    const iiifRecords = Array.isArray(searchRecords) ? searchRecords : [];
    const combined = [...iiifRecords, ...mdxRecords];
    await search.writeSearchIndex(combined);
    await search.ensureSearchRuntime();
    // No need to rebuild search.html again; it doesn't embed the index contents
    // Itemize counts by type for a clearer summary
    const counts = new Map();
    for (const r of combined) {
      const t = String((r && r.type) || 'page').toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const parts = Array.from(counts.entries())
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .map(([t, n]) => `${t}: ${n}`);
    const breakdown = parts.length ? `: ${parts.join(', ')}` : '';
    logLine(`✓ Search index: ${combined.length} total records${breakdown}\n`, 'cyan');
  } catch (_) {}
}

module.exports = { build };

if (require.main === module) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
