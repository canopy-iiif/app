const React = require('react');
const ReactDOMServer = require('react-dom/server');
const crypto = require('crypto');
const { path, withBase, rootRelativeHref, ensureDirSync, OUT_DIR, htmlShell, fsp } = require('../common');

async function ensureSearchRuntime() {
  const { fs, path } = require('../common');
  ensureDirSync(OUT_DIR);
  let esbuild = null;
  try { esbuild = require('../../ui/node_modules/esbuild'); } catch (_) { try { esbuild = require('esbuild'); } catch (_) {} }
  if (!esbuild) throw new Error('Search runtime bundling requires esbuild. Install dependencies before building.');
  const entry = path.join(__dirname, 'search-app.jsx');
  const scriptsDir = path.join(OUT_DIR, 'scripts');
  ensureDirSync(scriptsDir);
  const outFile = path.join(scriptsDir, 'search.js');
  // Ensure a global React shim is available to reduce search.js size
  try {
    const scriptsDir = path.join(OUT_DIR, 'scripts');
    ensureDirSync(scriptsDir);
    const vendorFile = path.join(scriptsDir, 'react-globals.js');
    const globalsEntry = `
      import React from 'react';
      import * as ReactDOM from 'react-dom';
      import { createRoot, hydrateRoot } from 'react-dom/client';
      (function(){ try{ window.React = React; window.ReactDOM = ReactDOM; window.ReactDOMClient = { createRoot, hydrateRoot }; }catch(e){} })();
    `;
    await esbuild.build({
      stdin: { contents: globalsEntry, resolveDir: process.cwd(), loader: 'js', sourcefile: 'react-globals-entry.js' },
      outfile: vendorFile,
      platform: 'browser',
      format: 'iife',
      bundle: true,
      sourcemap: false,
      target: ['es2018'],
      logLevel: 'silent',
      minify: true,
      define: { 'process.env.NODE_ENV': '"production"' },
    });
    // Build FlexSearch globals shim
    const flexFile = path.join(scriptsDir, 'flexsearch-globals.js');
    const flexEntry = `import Flex from 'flexsearch';(function(){try{window.FlexSearch=Flex;}catch(e){}})();`;
    await esbuild.build({
      stdin: { contents: flexEntry, resolveDir: process.cwd(), loader: 'js', sourcefile: 'flexsearch-globals-entry.js' },
      outfile: flexFile,
      platform: 'browser',
      format: 'iife',
      bundle: true,
      sourcemap: false,
      target: ['es2018'],
      logLevel: 'silent',
      minify: true,
      external: [],
    });
  } catch (_) {}
  const shimReactPlugin = {
    name: 'shim-react-globals',
    setup(build) {
      build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'react-shim' }));
      build.onLoad({ filter: /.*/, namespace: 'react-shim' }, () => ({
        contents: [
          "const R = (typeof window!=='undefined' && window.React) || {};\n",
          "export default R;\n",
          // Common hooks and APIs used by deps
          "export const Children = R.Children;\n",
          "export const Component = R.Component;\n",
          "export const Fragment = R.Fragment;\n",
          "export const createElement = R.createElement;\n",
          "export const cloneElement = R.cloneElement;\n",
          "export const createContext = R.createContext;\n",
          "export const forwardRef = R.forwardRef;\n",
          "export const memo = R.memo;\n",
          "export const startTransition = R.startTransition;\n",
          "export const isValidElement = R.isValidElement;\n",
          "export const useEffect = R.useEffect;\n",
          "export const useLayoutEffect = R.useLayoutEffect;\n",
          "export const useMemo = R.useMemo;\n",
          "export const useState = R.useState;\n",
          "export const useRef = R.useRef;\n",
          "export const useCallback = R.useCallback;\n",
          "export const useContext = R.useContext;\n",
          "export const useReducer = R.useReducer;\n",
          "export const useId = R.useId;\n",
          "export const useSyncExternalStore = R.useSyncExternalStore;\n",
        ].join(''),
        loader: 'js',
      }));
      build.onResolve({ filter: /^react-dom\/client$/ }, () => ({ path: 'react-dom/client', namespace: 'rdc-shim' }));
      build.onLoad({ filter: /.*/, namespace: 'rdc-shim' }, () => ({
        contents: [
          "const C = (typeof window!=='undefined' && window.ReactDOMClient) || {};\n",
          "export const createRoot = C.createRoot;\n",
          "export const hydrateRoot = C.hydrateRoot;\n",
        ].join(''),
        loader: 'js',
      }));
      build.onResolve({ filter: /^react-dom$/ }, () => ({ path: 'react-dom', namespace: 'rd-shim' }));
      build.onLoad({ filter: /.*/, namespace: 'rd-shim' }, () => ({
        contents: "export default (typeof window!=='undefined' && window.ReactDOM) || {};\n",
        loader: 'js',
      }));
      build.onResolve({ filter: /^flexsearch$/ }, () => ({ path: 'flexsearch', namespace: 'flex-shim' }));
      build.onLoad({ filter: /.*/, namespace: 'flex-shim' }, () => ({
        contents: "export default (typeof window!=='undefined' && window.FlexSearch) || {};\n",
        loader: 'js',
      }));
    }
  };
  try {
    const entryExists = (() => { try { return require('fs').existsSync(entry); } catch (_) { return false; } })();
    const commonBuild = {
      outfile: outFile,
      platform: 'browser',
      format: 'iife',
      bundle: true,
      sourcemap: true,
      target: ['es2018'],
      logLevel: 'silent',
      plugins: [shimReactPlugin],
      external: ['@samvera/clover-iiif/*'],
    };
    if (!entryExists) throw new Error('Search runtime entry missing: ' + entry);
    await esbuild.build({ entryPoints: [entry], ...commonBuild });
  } catch (e) {
    console.error('Search: bundle error:', e && e.message ? e.message : e);
    return;
  }
  try {
    const { logLine } = require('../build/log');
    let size = 0; try { const st = fs.statSync(outFile); size = st.size || 0; } catch (_) {}
    const kb = size ? ` (${(size/1024).toFixed(1)} KB)` : '';
    const rel = path.relative(process.cwd(), outFile).split(path.sep).join('/');
    logLine(`✓ Wrote ${rel}${kb}`, 'cyan');
  } catch (_) {}
}

async function buildSearchPage() {
  try {
    const outPath = path.join(OUT_DIR, 'search.html');
    ensureDirSync(path.dirname(outPath));
    // Require author-provided content/search/_layout.mdx; do not fall back to a generated page.
    const searchLayoutPath = path.join(path.resolve('content'), 'search', '_layout.mdx');
    let body = '';
    let head = '';
    if (!require('../common').fs.existsSync(searchLayoutPath)) {
      throw new Error('Missing required file: content/search/_layout.mdx');
    }
    const mdx = require('../build/mdx');
    const rendered = await mdx.compileMdxFile(searchLayoutPath, outPath, {});
    body = rendered && rendered.body ? rendered.body : '';
    head = rendered && rendered.head ? rendered.head : '';
    if (!body) throw new Error('Search: content/search/_layout.mdx produced empty output');
    const importMap = '';
    const jsAbs = path.join(OUT_DIR, 'scripts', 'search.js');
    let jsRel = path.relative(path.dirname(outPath), jsAbs).split(path.sep).join('/');
    let v = '';
    try { const st = require('fs').statSync(jsAbs); v = `?v=${Math.floor(st.mtimeMs || Date.now())}`; } catch (_) {}
    jsRel = jsRel + v;
    // Include react-globals vendor shim before search.js to provide window.React globals
    const vendorReactAbs = path.join(OUT_DIR, 'scripts', 'react-globals.js');
    const vendorFlexAbs = path.join(OUT_DIR, 'scripts', 'flexsearch-globals.js');
    const vendorSearchFormAbs = path.join(OUT_DIR, 'scripts', 'canopy-search-form.js');
    function verRel(abs) {
      let rel = path.relative(path.dirname(outPath), abs).split(path.sep).join('/');
      try { const st = require('fs').statSync(abs); rel += `?v=${Math.floor(st.mtimeMs || Date.now())}`; } catch (_) {}
      return rel;
    }
    const vendorTags = `<script src="${verRel(vendorReactAbs)}"></script><script src="${verRel(vendorFlexAbs)}"></script><script src="${verRel(vendorSearchFormAbs)}"></script>`;
    let headExtra = vendorTags + head + importMap;
    try {
      const { BASE_PATH } = require('../common');
      if (BASE_PATH) {
        headExtra = `<script>window.CANOPY_BASE_PATH=${JSON.stringify(BASE_PATH)}</script>` + headExtra;
      }
    } catch (_) {}
    let html = htmlShell({ title: 'Search', body, cssHref: null, scriptHref: jsRel, headExtra });
    try { html = require('./common').applyBaseToHtml(html); } catch (_) {}
    await fsp.writeFile(outPath, html, 'utf8');
    console.log('Search: Built', path.relative(process.cwd(), outPath));
  } catch (e) {
    console.warn('Search: Failed to build page', e && (e.message || e));
    throw e;
  }
}

function toSafeString(val, defaultValue = '') {
  try { return String(val == null ? defaultValue : val); } catch (_) { return defaultValue; }
}
function sanitizeRecord(r) {
  const title = toSafeString(r && r.title, '');
  const hrefRaw = toSafeString(r && r.href, '');
  const href = rootRelativeHref(hrefRaw);
  const type = toSafeString(r && r.type, 'page');
  const thumbnail = toSafeString(r && r.thumbnail, '');
  const safeTitle = title.length > 300 ? title.slice(0, 300) + '…' : title;
  const out = { title: safeTitle, href, type };
  if (thumbnail) out.thumbnail = thumbnail;
  // Preserve optional thumbnail dimensions for aspect ratio calculations in the UI
  try {
    const tw = Number(r && r.thumbnailWidth);
    const th = Number(r && r.thumbnailHeight);
    if (Number.isFinite(tw) && tw > 0) out.thumbnailWidth = tw;
    if (Number.isFinite(th) && th > 0) out.thumbnailHeight = th;
  } catch (_) {}
  return out;
}

async function writeSearchIndex(records) {
  const apiDir = path.join(OUT_DIR, 'api');
  ensureDirSync(apiDir);
  const idxPath = path.join(apiDir, 'search-index.json');
  const list = Array.isArray(records) ? records : [];
  const safe = list.map(sanitizeRecord);
  const json = JSON.stringify(safe, null, 2);
  const approxBytes = Buffer.byteLength(json, 'utf8');
  if (approxBytes > 10 * 1024 * 1024) {
    console.warn('Search: index size is large (', Math.round(approxBytes / (1024 * 1024)), 'MB ). Consider narrowing sources.');
  }
  await fsp.writeFile(idxPath, json, 'utf8');
  // Also write a small metadata file with a stable version hash for cache-busting and IDB keying
  try {
    const version = crypto.createHash('sha256').update(json).digest('hex');
    // Read optional search tabs order from canopy.yml
    let tabsOrder = [];
    try {
      const yaml = require('js-yaml');
      const cfgPath = require('./common').path.resolve(process.env.CANOPY_CONFIG || 'canopy.yml');
      if (require('./common').fs.existsSync(cfgPath)) {
        const raw = require('./common').fs.readFileSync(cfgPath, 'utf8');
        const data = yaml.load(raw) || {};
        const searchCfg = data && data.search ? data.search : {};
        const tabs = searchCfg && searchCfg.tabs ? searchCfg.tabs : {};
        const order = Array.isArray(tabs && tabs.order) ? tabs.order : [];
        tabsOrder = order.map((s) => String(s)).filter(Boolean);
      }
    } catch (_) {}
    const meta = {
      version,
      records: safe.length,
      bytes: approxBytes,
      updatedAt: new Date().toISOString(),
      // Expose optional search config to the client runtime
      search: { tabs: { order: tabsOrder } },
    };
    const metaPath = path.join(apiDir, 'index.json');
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    try {
      const { logLine } = require('./log');
      logLine(`✓ Search index version ${version.slice(0, 8)} (${safe.length} records)`, 'cyan');
    } catch (_) {}
    // Propagate version into IIIF cache index for a single, shared build identifier
    try {
      const { loadManifestIndex, saveManifestIndex } = require('./iiif');
      const iiifIdx = await loadManifestIndex();
      iiifIdx.version = version;
      await saveManifestIndex(iiifIdx);
      try {
        const { logLine } = require('./log');
        logLine(`• IIIF cache updated with version ${version.slice(0, 8)}`, 'blue');
      } catch (_) {}
    } catch (_) {}
  } catch (_) {}
}

// Compatibility: keep ensureResultTemplate as a no-op builder (template unused by React search)
async function ensureResultTemplate() {
  try { const { path } = require('./common'); const p = path.join(OUT_DIR, 'search-result.html'); await fsp.writeFile(p, '', 'utf8'); } catch (_) {}
}

module.exports = { ensureSearchRuntime, ensureResultTemplate, buildSearchPage, writeSearchIndex };
