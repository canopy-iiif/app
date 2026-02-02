const fs = require('fs');
const path = require('path');

const OUTPUT_ROOT = path.resolve(
  process.cwd(),
  process.env.ORG_SITE_OUT_DIR || '.org-build'
);
const SITE_ROOT = path.resolve(process.cwd(), 'site');
const ROOT_TEMPLATES = path.join(__dirname, 'root');
const { renderOrgIndex } = require('./render-index');

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

function copySiteToAppDir() {
  const dest = path.join(OUTPUT_ROOT, 'app');
  rmrf(dest);
  mkdirp(path.dirname(dest));
  fs.cpSync(SITE_ROOT, dest, { recursive: true });
}

function copySitemapsToRoot() {
  if (!fs.existsSync(SITE_ROOT)) return;
  const entries = fs.readdirSync(SITE_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^sitemap.*\.xml(\.gz)?$/i.test(entry.name)) continue;
    const srcPath = path.join(SITE_ROOT, entry.name);
    const destPath = path.join(OUTPUT_ROOT, entry.name);
    mkdirp(path.dirname(destPath));
    fs.copyFileSync(srcPath, destPath);
  }
}

function copyRootExtras() {
  if (!fs.existsSync(ROOT_TEMPLATES)) return;
  const entries = fs.readdirSync(ROOT_TEMPLATES);
  for (const entry of entries) {
    const srcPath = path.join(ROOT_TEMPLATES, entry);
    const destPath = path.join(OUTPUT_ROOT, entry);
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      rmrf(destPath);
      mkdirp(path.dirname(destPath));
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else if (stats.isFile()) {
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
  copySiteToAppDir();
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
