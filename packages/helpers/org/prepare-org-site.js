const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT_ROOT = path.resolve(
  process.cwd(),
  process.env.ORG_SITE_OUT_DIR || '.org-build'
);
const SITE_ROOT = path.resolve(process.cwd(), 'site');
const ROOT_TEMPLATES = path.join(__dirname, 'root');
const { renderOrgIndex } = require('./render-index');

const DEFAULT_CANONICAL_BASE = 'https://canopy-iiif.github.io/app';

function rmrf(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch (_) {
    /* noop */
  }
}

function mkdirp(target) {
  fs.mkdirSync(target, { recursive: true });
}

function ensureSiteExists() {
  if (!fs.existsSync(SITE_ROOT) || !fs.statSync(SITE_ROOT).isDirectory()) {
    throw new Error('Missing build output: run `npm run build` before preparing the org site.');
  }
}

function getCanonicalBaseUrl() {
  const raw = String(process.env.CANOPY_BASE_URL || '').trim();
  if (raw) return raw;
  return DEFAULT_CANONICAL_BASE;
}

function extractRelativePath(href) {
  if (!href && href !== 0) return '';
  const raw = String(href).trim();
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      let rel = url.pathname || '/';
      if (url.search) rel += url.search;
      if (url.hash) rel += url.hash;
      return rel || '/';
    }
  } catch (_) {}
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
}

function normalizeRelativePath(rel) {
  if (!rel) return '/';
  return rel.startsWith('/') ? rel : `/${rel}`;
}

function joinBasePath(originPath, rel) {
  const basePath = originPath && originPath !== '/' ? originPath : '';
  let remainder = rel || '/';
  if (basePath) {
    if (remainder === basePath) {
      remainder = '/';
    } else if (remainder.startsWith(`${basePath}/`)) {
      remainder = remainder.slice(basePath.length);
      if (!remainder.startsWith('/')) remainder = `/${remainder}`;
    }
  }
  if (remainder === '/' || remainder === '') {
    return basePath || '/';
  }
  return `${basePath}${remainder}`;
}

function rewriteSitemapXml(contents, baseUrl) {
  if (!contents) return contents;
  const canonical = String(baseUrl || '').trim();
  if (!canonical) return contents;
  let origin = canonical;
  let originPath = '';
  try {
    const parsed = new URL(canonical);
    origin = parsed.origin.replace(/\/$/, '');
    originPath = (parsed.pathname || '').replace(/\/$/, '');
  } catch (_) {
    const match = canonical.match(/^(https?:\/\/[^\/]+)(\/.*)?$/i);
    if (match) {
      origin = match[1].replace(/\/$/, '');
      originPath = (match[2] || '').replace(/\/$/, '');
    }
  }
  if (!origin) return contents;

  return contents.replace(/<loc>([^<]+)<\/loc>/gi, (full, href) => {
    const rel = normalizeRelativePath(extractRelativePath(href));
    const finalPath = joinBasePath(originPath, rel);
    return `<loc>${origin}${finalPath}</loc>`;
  });
}

function copySitemapsToRoot() {
  if (!fs.existsSync(SITE_ROOT)) return;
  const entries = fs.readdirSync(SITE_ROOT, { withFileTypes: true });
  const canonicalBase = getCanonicalBaseUrl();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^sitemap.*\.xml(\.gz)?$/i.test(entry.name)) continue;
    const srcPath = path.join(SITE_ROOT, entry.name);
    const destPath = path.join(OUTPUT_ROOT, entry.name);
    mkdirp(path.dirname(destPath));
    if (/\.xml$/i.test(entry.name)) {
      const raw = fs.readFileSync(srcPath, 'utf8');
      const rewritten = rewriteSitemapXml(raw, canonicalBase);
      fs.writeFileSync(destPath, rewritten, 'utf8');
    } else if (/\.xml\.gz$/i.test(entry.name)) {
      try {
        const raw = fs.readFileSync(srcPath);
        const unzipped = zlib.gunzipSync(raw);
        const rewritten = rewriteSitemapXml(unzipped.toString('utf8'), canonicalBase);
        const rezipped = zlib.gzipSync(Buffer.from(rewritten, 'utf8'));
        fs.writeFileSync(destPath, rezipped);
      } catch (_) {
        fs.copyFileSync(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const ALLOWED_ROOT_FILES = ['robots.txt'];

function shouldCopyRootFile(name) {
  const lower = name.toLowerCase();
  if (ALLOWED_ROOT_FILES.includes(lower)) return true;
  if (lower.startsWith('readme')) return true;
  if (lower.endsWith('.css')) return true;
  return false;
}

function copyRootExtras() {
  if (!fs.existsSync(ROOT_TEMPLATES)) return;
  const entries = fs.readdirSync(ROOT_TEMPLATES);
  for (const entry of entries) {
    const srcPath = path.join(ROOT_TEMPLATES, entry);
    const destPath = path.join(OUTPUT_ROOT, entry);
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      continue;
    }
    if (stats.isFile() && shouldCopyRootFile(entry)) {
      mkdirp(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function writeNoJekyllMarker() {
  const markerPath = path.join(OUTPUT_ROOT, '.nojekyll');
  fs.writeFileSync(markerPath, '', 'utf8');
}

async function renderCustomIndex() {
  const mdxPath = path.join(ROOT_TEMPLATES, 'index.mdx');
  if (!fs.existsSync(mdxPath)) return;
  const outPath = path.join(OUTPUT_ROOT, 'index.html');
  await renderOrgIndex(mdxPath, outPath);
}

async function main() {
  ensureSiteExists();
  rmrf(OUTPUT_ROOT);
  mkdirp(OUTPUT_ROOT);
  copySitemapsToRoot();
  copyRootExtras();
  await renderCustomIndex();
  writeNoJekyllMarker();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
