const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const yaml = require('js-yaml');
const { resolveCanopyConfigPath } = require('./config-path');

const CONTENT_DIR = path.resolve('content');
const OUT_DIR = path.resolve('site');
const CACHE_DIR = path.resolve('.cache/mdx');
const ASSETS_DIR = path.resolve('assets');

const { readBasePath, withBasePath } = require('./base-path');

const BASE_PATH = readBasePath();
let cachedAppearance = null;
let cachedAccent = null;
let cachedSiteMetadata = null;
let cachedSearchPageMetadata = null;
const DEFAULT_SITE_TITLE = 'Site title';
const DEFAULT_SEARCH_PAGE_TITLE = 'Search';
const DEFAULT_SEARCH_PAGE_DESCRIPTION = '';

function resolveThemeAppearance() {
  if (cachedAppearance) return cachedAppearance;
  cachedAppearance = 'light';
  try {
    const { loadCanopyTheme } = require('@canopy-iiif/app/ui/theme');
    if (typeof loadCanopyTheme === 'function') {
      const theme = loadCanopyTheme();
      const appearance = theme && theme.appearance ? String(theme.appearance) : '';
      if (appearance.toLowerCase() === 'dark') {
        cachedAppearance = 'dark';
      }
    }
  } catch (_) {}
  return cachedAppearance;
}

function resolveThemeAccent() {
  if (cachedAccent) return cachedAccent;
  cachedAccent = 'indigo';
  try {
    const { loadCanopyTheme } = require('@canopy-iiif/app/ui/theme');
    if (typeof loadCanopyTheme === 'function') {
      const theme = loadCanopyTheme();
      const accent = theme && theme.accent && theme.accent.name ? String(theme.accent.name) : '';
      const normalized = accent.trim().toLowerCase();
      if (normalized) cachedAccent = normalized;
    }
  } catch (_) {}
  return cachedAccent;
}

function readYamlConfigBaseUrl() {
  try {
    const p = resolveCanopyConfigPath();
    if (!fs.existsSync(p)) return '';
    const raw = fs.readFileSync(p, 'utf8');
    const data = yaml.load(raw) || {};
    const site = data && data.site;
    const url = site && site.baseUrl ? String(site.baseUrl) : '';
    return url;
  } catch (_) { return ''; }
}

function readSiteMetadata() {
  if (cachedSiteMetadata) return cachedSiteMetadata;
  cachedSiteMetadata = { title: DEFAULT_SITE_TITLE };
  try {
    const cfgPath = resolveCanopyConfigPath();
    if (!fs.existsSync(cfgPath)) return cachedSiteMetadata;
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const data = yaml.load(raw) || {};
    const directTitle = data && typeof data.title === 'string' ? data.title.trim() : '';
    const nestedTitle =
      data && data.site && typeof data.site.title === 'string'
        ? data.site.title.trim()
        : '';
    const resolved = directTitle || nestedTitle || DEFAULT_SITE_TITLE;
    cachedSiteMetadata = { title: resolved };
  } catch (_) {}
  return cachedSiteMetadata;
}

function getSiteTitle() {
  const site = readSiteMetadata();
  if (site && typeof site.title === 'string' && site.title.trim()) {
    return site.title.trim();
  }
  return DEFAULT_SITE_TITLE;
}

function readSearchPageMetadata() {
  if (cachedSearchPageMetadata) return cachedSearchPageMetadata;
  cachedSearchPageMetadata = {
    title: DEFAULT_SEARCH_PAGE_TITLE,
    description: DEFAULT_SEARCH_PAGE_DESCRIPTION,
  };
  try {
    const cfgPath = resolveCanopyConfigPath();
    if (!fs.existsSync(cfgPath)) return cachedSearchPageMetadata;
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const data = yaml.load(raw) || {};
    const searchCfg = data && data.search ? data.search : null;
    const pageCfg = searchCfg && searchCfg.page ? searchCfg.page : null;
    const title = pageCfg && typeof pageCfg.title === 'string' ? pageCfg.title.trim() : '';
    const description =
      pageCfg && typeof pageCfg.description === 'string'
        ? pageCfg.description.trim()
        : '';
    cachedSearchPageMetadata = {
      title: title || DEFAULT_SEARCH_PAGE_TITLE,
      description: description || DEFAULT_SEARCH_PAGE_DESCRIPTION,
    };
  } catch (_) {}
  return cachedSearchPageMetadata;
}

// Determine the absolute site origin (scheme + host[:port])
// Priority:
// 1) CANOPY_BASE_URL env
// 2) canopy.yml → site.baseUrl
// 3) dev server default http://localhost:PORT (PORT env or 5001)
const BASE_ORIGIN = (() => {
  const env = String(process.env.CANOPY_BASE_URL || '').trim();
  if (env) return env.replace(/\/$/, '');
  const cfg = readYamlConfigBaseUrl();
  if (cfg) return cfg.replace(/\/$/, '');
  const port = Number(process.env.PORT || 5001);
  return `http://localhost:${port}`;
})();

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    await fsp.rm(dir, { recursive: true, force: true });
  }
  await fsp.mkdir(dir, { recursive: true });
}

function normalizeClassList(value) {
  if (!value) return '';
  const list = Array.isArray(value) ? value : [value];
  const classes = [];
  for (const entry of list) {
    if (!entry && entry !== 0) continue;
    const raw = String(entry)
      .split(/\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    classes.push(...raw);
  }
  const unique = classes.filter(Boolean);
  return unique.length ? unique.join(' ') : '';
}

function canopyBodyClassForType(type) {
  const raw = String(type == null || type === '' ? 'page' : type)
    .trim()
    .toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  if (!slug) return 'canopy-type-page';
  return `canopy-type-${slug}`;
}

function htmlShell({ title, body, cssHref, scriptHref, headExtra, bodyClass }) {
  const scriptTag = scriptHref ? `<script defer src="${scriptHref}"></script>` : '';
  const extra = headExtra ? String(headExtra) : '';
  const cssTag = cssHref ? `<link rel="stylesheet" href="${cssHref}">` : '';
  const appearance = resolveThemeAppearance();
  const accent = resolveThemeAccent();
  const htmlAttrs = [];
  if (appearance === 'dark') htmlAttrs.push('class="dark"');
  htmlAttrs.push(`data-accent="${accent || 'indigo'}"`);
  const htmlAttr = htmlAttrs.length ? ` ${htmlAttrs.join(' ')}` : '';
  const hasCustomTitle = /<title\b/i.test(extra);
  const titleTag = hasCustomTitle ? '' : `<title>${title}</title>`;
  const bodyClassName = normalizeClassList(bodyClass);
  const bodyAttr = bodyClassName ? ` class="${bodyClassName}"` : '';
  return `<!doctype html><html lang="en"${htmlAttr}><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>${titleTag}${extra}${cssTag}${scriptTag}</head><body${bodyAttr}>${body}</body></html>`;
}

function withBase(href) {
  return withBasePath(href);
}

function rootRelativeHref(href) {
  try {
    let raw = href == null ? '' : String(href);
    raw = raw.trim();
    if (!raw) return '/';
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
    if (raw.startsWith('//')) return raw;
    if (raw.startsWith('#') || raw.startsWith('?')) return raw;
    let cleaned = raw;
    if (cleaned.startsWith('/')) cleaned = cleaned.replace(/^\/+/, '');
    while (cleaned.startsWith('./')) cleaned = cleaned.slice(2);
    while (cleaned.startsWith('../')) cleaned = cleaned.slice(3);
    if (!cleaned) return '/';
    return '/' + cleaned;
  } catch (_) {
    return href;
  }
}

// Convert a site-relative path (e.g., "/api/foo.json") to an absolute URL.
// Handles either:
// - BASE_ORIGIN that may already include a path prefix (e.g., https://host/org/repo)
// - BASE_PATH (path prefix) when BASE_ORIGIN has no path
// If input is already absolute (http/https), returns as-is.
function absoluteUrl(p) {
  try {
    const raw = String(p || '');
    if (/^https?:\/\//i.test(raw)) return raw;
    const rel = raw.startsWith('/') ? raw : '/' + raw.replace(/^\/?/, '');
    // Parse BASE_ORIGIN; it may include a path (e.g., GH Pages repo path)
    let originBase = '';
    let originPath = '';
    try {
      const u = new URL(BASE_ORIGIN);
      originBase = u.origin.replace(/\/$/, '');
      originPath = (u.pathname || '').replace(/\/$/, '');
    } catch (_) {
      originBase = String(BASE_ORIGIN || '').replace(/\/$/, '');
      originPath = '';
    }
    // Prefer path from BASE_ORIGIN; if absent, fall back to BASE_PATH
    let prefixPath = originPath || String(BASE_PATH || '');
    prefixPath = prefixPath.replace(/\/$/, '');
    const fullPath = (prefixPath ? prefixPath : '') + rel; // rel already has leading '/'
    return originBase + fullPath;
  } catch (_) {
    return p;
  }
}

// Apply BASE_PATH to key URL-bearing attributes (href/src/action/formaction) in an HTML string.
function applyBaseToHtml(html) {
  if (!BASE_PATH) return html;
  try {
    const out = String(html || '');
    const baseRaw = BASE_PATH.startsWith('/') ? BASE_PATH : `/${BASE_PATH}`;
    const normalizedBase = baseRaw.replace(/\/$/, '');
    if (!normalizedBase || normalizedBase === '/') return out;

    const attrPattern = '(?:href|src|action|formaction)';
    const pathPattern = "\\/(?!\\/)[^'\"\\s<]*";
    const pattern = new RegExp(`(${attrPattern})=(["'])((${pathPattern}))\\2`, 'g');

    return out.replace(pattern, (match, attr, quote, path) => {
      if (path === normalizedBase || path.startsWith(`${normalizedBase}/`)) {
        return match;
      }
      return `${attr}=${quote}${normalizedBase}${path}${quote}`;
    });
  } catch (_) {
    return html;
  }
}

module.exports = {
  fs,
  fsp,
  path,
  CONTENT_DIR,
  OUT_DIR,
  CACHE_DIR,
  ASSETS_DIR,
  BASE_PATH,
  ensureDirSync,
  cleanDir,
  htmlShell,
  withBase,
  BASE_ORIGIN,
  absoluteUrl,
  applyBaseToHtml,
  rootRelativeHref,
  canopyBodyClassForType,
  readSiteMetadata,
  getSiteTitle,
  DEFAULT_SITE_TITLE,
  readSearchPageMetadata,
  DEFAULT_SEARCH_PAGE_TITLE,
  DEFAULT_SEARCH_PAGE_DESCRIPTION,
};
