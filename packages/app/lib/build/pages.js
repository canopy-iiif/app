const { fs, fsp, path, CONTENT_DIR, OUT_DIR, ensureDirSync, htmlShell } = require('../common');
const { log } = require('./log');
const mdx = require('./mdx');

// Cache: dir -> frontmatter data for _layout.mdx in that dir
const LAYOUT_META = new Map();

async function getNearestDirLayoutMeta(filePath) {
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

function mapContentPathToOutput(filePath) {
  const rel = path.relative(CONTENT_DIR, filePath);
  const outRel = rel.replace(/\.mdx$/i, '.html');
  return path.join(OUT_DIR, outRel);
}

async function renderContentMdxToHtml(filePath, outPath, extraProps = {}) {
  const source = await fsp.readFile(filePath, 'utf8');
  const title = mdx.extractTitle(source);
  const { body, head } = await mdx.compileMdxFile(filePath, outPath, null, extraProps);
  const cssRel = path
    .relative(path.dirname(outPath), path.join(OUT_DIR, 'styles', 'styles.css'))
    .split(path.sep)
    .join('/');
  const needsHydrateViewer = body.includes('data-canopy-viewer');
  const needsHydrateSlider = body.includes('data-canopy-slider');
  const needsCommand = true; // command runtime is global
  const needsFacets = body.includes('data-canopy-related-items');
  const viewerRel = needsHydrateViewer
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-viewer.js')).split(path.sep).join('/')
    : null;
  const sliderRel = (needsHydrateSlider || needsFacets)
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-slider.js')).split(path.sep).join('/')
    : null;
  const facetsRel = needsFacets
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-related-items.js')).split(path.sep).join('/')
    : null;
  let commandRel = null;
  if (needsCommand) {
    const cmdAbs = path.join(OUT_DIR, 'scripts', 'canopy-command.js');
    let rel = path.relative(path.dirname(outPath), cmdAbs).split(path.sep).join('/');
    try { const st = fs.statSync(cmdAbs); rel += `?v=${Math.floor(st.mtimeMs || Date.now())}`; } catch (_) {}
    commandRel = rel;
  }
  let jsRel = null;
  if (needsFacets && sliderRel) jsRel = sliderRel;
  else if (viewerRel) jsRel = viewerRel;
  else if (sliderRel) jsRel = sliderRel;
  else if (facetsRel) jsRel = facetsRel;
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
  try {
    const { BASE_PATH } = require('../common');
    if (BASE_PATH) vendorTag = `<script>window.CANOPY_BASE_PATH=${JSON.stringify(BASE_PATH)}</script>` + vendorTag;
  } catch (_) {}
  let headExtra = head;
  const extraScripts = [];
  if (facetsRel && jsRel !== facetsRel) extraScripts.push(`<script defer src="${facetsRel}"></script>`);
  if (viewerRel && jsRel !== viewerRel) extraScripts.push(`<script defer src="${viewerRel}"></script>`);
  if (sliderRel && jsRel !== sliderRel) extraScripts.push(`<script defer src="${sliderRel}"></script>`);
  if (commandRel && jsRel !== commandRel) extraScripts.push(`<script defer src="${commandRel}"></script>`);
  if (extraScripts.length) headExtra = extraScripts.join('') + headExtra;
  const html = htmlShell({ title, body, cssHref: cssRel || 'styles.css', scriptHref: jsRel, headExtra: vendorTag + headExtra });
  const { applyBaseToHtml } = require('../common');
  return applyBaseToHtml(html);
}

async function processContentEntry(absPath, pagesMetadata = []) {
  const stat = await fsp.stat(absPath);
  if (stat.isDirectory()) return;
  if (/\.mdx$/i.test(absPath)) {
    if (mdx.isReservedFile(absPath)) return;
    const outPath = mapContentPathToOutput(absPath);
    ensureDirSync(path.dirname(outPath));
    try {
      try { log(`• Processing MDX ${absPath}\n`, 'blue'); } catch (_) {}
      const base = path.basename(absPath);
      const extra = base.toLowerCase() === 'sitemap.mdx' ? { pages: pagesMetadata } : {};
      const html = await renderContentMdxToHtml(absPath, outPath, extra);
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

async function buildContentTree(dir, pagesMetadata = []) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await buildContentTree(p, pagesMetadata);
    else if (e.isFile()) await processContentEntry(p, pagesMetadata);
  }
}

module.exports = {
  getNearestDirLayoutMeta,
  mapContentPathToOutput,
  renderContentMdxToHtml,
  processContentEntry,
  buildContentTree,
};
