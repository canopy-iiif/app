const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const CONTENT_DIR = path.resolve('content');
const OUT_DIR = path.resolve('site');
const CACHE_DIR = path.resolve('.cache/mdx');
const ASSETS_DIR = path.resolve('assets');

const BASE_PATH = String(process.env.CANOPY_BASE_PATH || '').replace(/\/$/, '');

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
  applyBaseToHtml,
};
