const { fs, fsp, path, CONTENT_DIR, OUT_DIR, ensureDirSync, htmlShell } = require('../common');
const { log } = require('./log');
const mdx = require('./mdx');
const navigation = require('../components/navigation');

function normalizeWhitespace(value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function truncateDescription(value, max = 240) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  const slice = normalized.slice(0, Math.max(0, max - 3)).trimEnd();
  return `${slice}...`;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readFrontmatterString(data, key) {
  if (!data) return '';
  const raw = data[key];
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  return '';
}

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
  const relContentPath = path.relative(CONTENT_DIR, filePath);
  const normalizedRel = navigation.normalizeRelativePath(relContentPath);
  const pageInfo = navigation.getPageInfo(normalizedRel);
  const navData = navigation.buildNavigationForFile(normalizedRel);
  const mergedProps = { ...(extraProps || {}) };
  const frontmatter =
    typeof mdx.parseFrontmatter === 'function'
      ? mdx.parseFrontmatter(source)
      : { data: null, content: source };
  const frontmatterData = frontmatter && isPlainObject(frontmatter.data) ? frontmatter.data : null;
  let layoutMeta = null;
  try {
    layoutMeta = await getNearestDirLayoutMeta(filePath);
  } catch (_) {
    layoutMeta = null;
  }
  const directType = frontmatterData && typeof frontmatterData.type === 'string' ? frontmatterData.type.trim() : '';
  const layoutType = layoutMeta && typeof layoutMeta.type === 'string' ? String(layoutMeta.type).trim() : '';
  const resolvedType = directType || layoutType || (!frontmatterData ? 'page' : '');
  const frontmatterDescription = frontmatterData && typeof frontmatterData.description === 'string'
    ? truncateDescription(frontmatterData.description)
    : '';
  const extractedPlain = typeof mdx.extractPlainText === 'function'
    ? mdx.extractPlainText(source)
    : '';
  const derivedDescription = truncateDescription(extractedPlain);
  const resolvedDescription = frontmatterDescription || derivedDescription;
  const ogImageFrontmatter =
    readFrontmatterString(frontmatterData, 'og:image') ||
    readFrontmatterString(frontmatterData, 'ogImage');
  const genericImage = readFrontmatterString(frontmatterData, 'image');
  const resolvedImage = ogImageFrontmatter || genericImage;
  const frontmatterMeta = frontmatterData && isPlainObject(frontmatterData.meta) ? frontmatterData.meta : null;
  const headings = mdx.extractHeadings(source);
  const basePage = pageInfo ? { ...pageInfo } : {};
  if (title) basePage.title = title;
  if (resolvedType) basePage.type = resolvedType;
  if (resolvedDescription) basePage.description = resolvedDescription;
  if (basePage.href && !basePage.url) basePage.url = basePage.href;
  if (resolvedImage) {
    basePage.image = resolvedImage;
    basePage.ogImage = ogImageFrontmatter || resolvedImage;
  }
  const existingMeta = basePage.meta && typeof basePage.meta === 'object' ? basePage.meta : {};
  const pageMeta = { ...existingMeta };
  if (title) pageMeta.title = title;
  if (resolvedDescription) pageMeta.description = resolvedDescription;
  if (resolvedType) pageMeta.type = resolvedType;
  if (basePage.url || basePage.href) pageMeta.url = basePage.url || basePage.href || pageMeta.url;
  if (resolvedImage) {
    pageMeta.image = resolvedImage;
    if (!pageMeta.ogImage) pageMeta.ogImage = resolvedImage;
  }
  if (frontmatterMeta) Object.assign(pageMeta, frontmatterMeta);
  if (Object.keys(pageMeta).length) basePage.meta = pageMeta;
  if (Object.keys(basePage).length) {
    mergedProps.page = mergedProps.page
      ? { ...basePage, ...mergedProps.page }
      : basePage;
  }
  if (navData && !mergedProps.navigation) {
    mergedProps.navigation = navData;
  }
  if (headings && headings.length) {
    mergedProps.page = mergedProps.page
      ? { ...mergedProps.page, headings }
      : { headings };
  }
  const { body, head } = await mdx.compileMdxFile(filePath, outPath, null, mergedProps);
  const needsHydrateViewer =
    body.includes('data-canopy-viewer') ||
    body.includes('data-canopy-scroll') ||
    body.includes('data-canopy-image');
  const needsHydrateSlider = body.includes('data-canopy-slider');
  const needsHeroSlider = body.includes('data-canopy-hero-slider');
  const needsSearchForm = true; // search form runtime is global
  const needsFacets = body.includes('data-canopy-related-items');
  const viewerRel = needsHydrateViewer
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-viewer.js')).split(path.sep).join('/')
    : null;
  const sliderRel = (needsHydrateSlider || needsFacets)
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-slider.js')).split(path.sep).join('/')
    : null;
  const heroRel = needsHeroSlider
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-hero-slider.js')).split(path.sep).join('/')
    : null;
  const heroCssRel = needsHeroSlider
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-hero-slider.css')).split(path.sep).join('/')
    : null;
  const facetsRel = needsFacets
    ? path.relative(path.dirname(outPath), path.join(OUT_DIR, 'scripts', 'canopy-related-items.js')).split(path.sep).join('/')
    : null;
  let searchFormRel = null;
  if (needsSearchForm) {
    const runtimeAbs = path.join(OUT_DIR, 'scripts', 'canopy-search-form.js');
    let rel = path.relative(path.dirname(outPath), runtimeAbs).split(path.sep).join('/');
    try { const st = fs.statSync(runtimeAbs); rel += `?v=${Math.floor(st.mtimeMs || Date.now())}`; } catch (_) {}
    searchFormRel = rel;
  }
  let jsRel = null;
  if (needsHeroSlider && heroRel) jsRel = heroRel;
  else if (needsFacets && sliderRel) jsRel = sliderRel;
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
  const headSegments = [head];
  const extraScripts = [];
  if (heroRel && jsRel !== heroRel) extraScripts.push(`<script defer src="${heroRel}"></script>`);
  if (facetsRel && jsRel !== facetsRel) extraScripts.push(`<script defer src="${facetsRel}"></script>`);
  if (viewerRel && jsRel !== viewerRel) extraScripts.push(`<script defer src="${viewerRel}"></script>`);
  if (sliderRel && jsRel !== sliderRel) extraScripts.push(`<script defer src="${sliderRel}"></script>`);
  if (searchFormRel && jsRel !== searchFormRel) extraScripts.push(`<script defer src="${searchFormRel}"></script>`);
  const extraStyles = [];
  if (heroCssRel) {
    let rel = heroCssRel;
    try {
      const heroCssAbs = path.join(OUT_DIR, 'scripts', 'canopy-hero-slider.css');
      const st = fs.statSync(heroCssAbs);
      rel += `?v=${Math.floor(st.mtimeMs || Date.now())}`;
    } catch (_) {}
    extraStyles.push(`<link rel="stylesheet" href="${rel}">`);
  }
  if (extraStyles.length) headSegments.push(extraStyles.join(''));
  if (extraScripts.length) headSegments.push(extraScripts.join(''));
  const headExtra = headSegments.join('') + vendorTag;
  const html = htmlShell({ title, body, cssHref: null, scriptHref: jsRel, headExtra });
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
