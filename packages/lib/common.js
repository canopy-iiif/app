const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const CONTENT_DIR = path.resolve('content');
const OUT_DIR = path.resolve('site');
const CACHE_DIR = path.resolve('.cache/mdx');
const ASSETS_DIR = path.resolve('assets');

const BASE_PATH = String(process.env.CANOPY_BASE_PATH || '').replace(/\/$/, '');

function readYamlConfigBaseUrl() {
  try {
    const y = require('js-yaml');
    const p = path.resolve(process.env.CANOPY_CONFIG || 'canopy.yml');
    if (!fs.existsSync(p)) return '';
    const raw = fs.readFileSync(p, 'utf8');
    const data = y.load(raw) || {};
    const site = data && data.site;
    const url = site && site.baseUrl ? String(site.baseUrl) : '';
    return url;
  } catch (_) { return ''; }
}

// Determine the absolute site origin (scheme + host[:port])
// Priority:
// 1) CANOPY_BASE_URL env
// 2) canopy.yml → site.baseUrl
// 3) dev server default http://localhost:PORT (PORT env or 3000)
const BASE_ORIGIN = (() => {
  const env = String(process.env.CANOPY_BASE_URL || '').trim();
  if (env) return env.replace(/\/$/, '');
  const cfg = readYamlConfigBaseUrl();
  if (cfg) return cfg.replace(/\/$/, '');
  const port = Number(process.env.PORT || 3000);
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

function htmlShell({ title, body, cssHref, scriptHref, headExtra }) {
  const scriptTag = scriptHref ? `<script defer src="${scriptHref}"></script>` : '';
  const extra = headExtra ? String(headExtra) : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title>${extra}<link rel="stylesheet" href="${cssHref}">${scriptTag}</head><body>${body}</body></html>`;
}

function withBase(href) {
  if (!href) return href;
  if (!BASE_PATH) return href;
  if (typeof href === 'string' && href.startsWith('/')) return `${BASE_PATH}${href}`;
  return href;
}

// Convert a site-relative path (e.g., "/api/foo.json") to an absolute URL
// using BASE_PATH and BASE_ORIGIN. If already absolute (http/https), returns as-is.
function absoluteUrl(p) {
  try {
    const s = String(p || '');
    if (/^https?:\/\//i.test(s)) return s;
    const withB = withBase(s);
    if (typeof withB === 'string' && withB.startsWith('/')) return `${BASE_ORIGIN}${withB}`;
    // For relative paths, best-effort join
    return `${BASE_ORIGIN}/${String(withB).replace(/^\/?/, '')}`;
  } catch (_) { return p; }
}

// Apply BASE_PATH to any absolute href/src attributes found in an HTML string.
function applyBaseToHtml(html) {
  if (!BASE_PATH) return html;
  try {
    let out = String(html || '');
    // Avoid protocol-relative (//example.com) by using a negative lookahead
    out = out.replace(/(href|src)=(\")\/(?!\/)/g, `$1=$2${BASE_PATH}/`);
    out = out.replace(/(href|src)=(\')\/(?!\/)/g, `$1=$2${BASE_PATH}/`);
    return out;
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
};
