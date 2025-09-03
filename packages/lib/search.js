const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { path, withBase } = require('./common');
const { ensureDirSync, OUT_DIR, htmlShell, fsp } = require('./common');

async function ensureSearchRuntime() {
  const { fs, path } = require('./common');
  ensureDirSync(OUT_DIR);
  let esbuild = null;
  try { esbuild = require('../ui/node_modules/esbuild'); } catch (_) { try { esbuild = require('esbuild'); } catch (_) {} }
  if (!esbuild) { console.warn('Search: skipped bundling (no esbuild)'); return; }
  const entry = path.join(__dirname, 'search-app.jsx');
  const outFile = path.join(OUT_DIR, 'search.js');
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
          "export const useState = R.useState;\n",
          "export const useMemo = R.useMemo;\n",
          "export const useEffect = R.useEffect;\n",
          "export const useRef = R.useRef;\n",
          "export const Fragment = R.Fragment;\n",
          "export const createElement = R.createElement;\n",
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
  await esbuild.build({
    entryPoints: [entry],
    outfile: outFile,
    platform: 'browser',
    format: 'iife',
    bundle: true,
    sourcemap: true,
    target: ['es2018'],
    logLevel: 'silent',
    plugins: [shimReactPlugin],
  });
  try {
    const { logLine } = require('./log');
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
    // If the author provided content/search/_layout.mdx, render it via MDX; otherwise fall back.
    const searchLayoutPath = path.join(path.resolve('content'), 'search', '_layout.mdx');
    let body = '';
    let head = '';
    if (require('./common').fs.existsSync(searchLayoutPath)) {
      try {
        const mdx = require('./mdx');
        const rendered = await mdx.compileMdxFile(searchLayoutPath, outPath, {});
        body = rendered && rendered.body ? rendered.body : '';
        head = rendered && rendered.head ? rendered.head : '';
      } catch (e) {
        console.warn('Search: Failed to render content/search/_layout.mdx, falling back:', e && e.message ? e.message : e);
      }
    }
    if (!body) {
      // Minimal mount container; React SearchApp mounts into #search-root
      let content = React.createElement(
        'div',
        null,
        React.createElement('h1', null, 'Search'),
        React.createElement('div', { id: 'search-root' })
      );
      const { loadAppWrapper } = require('./mdx');
      const app = await loadAppWrapper();
      const wrappedApp = app && app.App ? React.createElement(app.App, null, content) : content;
      body = ReactDOMServer.renderToStaticMarkup(wrappedApp);
      head = app && app.Head ? ReactDOMServer.renderToStaticMarkup(React.createElement(app.Head)) : '';
    }
    const importMap = '';
    const cssRel = path.relative(path.dirname(outPath), path.join(OUT_DIR, 'styles.css')).split(path.sep).join('/');
    const jsAbs = path.join(OUT_DIR, 'search.js');
    let jsRel = path.relative(path.dirname(outPath), jsAbs).split(path.sep).join('/');
    let v = '';
    try { const st = require('fs').statSync(jsAbs); v = `?v=${Math.floor(st.mtimeMs || Date.now())}`; } catch (_) {}
    jsRel = jsRel + v;
    // Include react-globals vendor shim before search.js to provide window.React globals
    const vendorReactAbs = path.join(OUT_DIR, 'scripts', 'react-globals.js');
    const vendorFlexAbs = path.join(OUT_DIR, 'scripts', 'flexsearch-globals.js');
    function verRel(abs) {
      let rel = path.relative(path.dirname(outPath), abs).split(path.sep).join('/');
      try { const st = require('fs').statSync(abs); rel += `?v=${Math.floor(st.mtimeMs || Date.now())}`; } catch (_) {}
      return rel;
    }
    const vendorTags = `<script src="${verRel(vendorReactAbs)}"></script><script src="${verRel(vendorFlexAbs)}"></script>`;
    let html = htmlShell({ title: 'Search', body, cssHref: cssRel || 'styles.css', scriptHref: jsRel, headExtra: vendorTags + head + importMap });
    try { html = require('./common').applyBaseToHtml(html); } catch (_) {}
    await fsp.writeFile(outPath, html, 'utf8');
    console.log('Search: Built', path.relative(process.cwd(), outPath));
  } catch (e) {
    console.warn('Search: Failed to build page', e.message);
  }
}

function toSafeString(val, fallback = '') { try { return String(val == null ? fallback : val); } catch (_) { return fallback; } }
function sanitizeRecord(r) {
  const title = toSafeString(r && r.title, '');
  const href = toSafeString(r && r.href, '');
  const type = toSafeString(r && r.type, 'page');
  const thumbnail = toSafeString(r && r.thumbnail, '');
  const safeTitle = title.length > 300 ? title.slice(0, 300) + '…' : title;
  const out = { title: safeTitle, href, type };
  if (thumbnail) out.thumbnail = thumbnail;
  return out;
}

async function writeSearchIndex(records) {
  const idxPath = path.join(OUT_DIR, 'search-index.json');
  const list = Array.isArray(records) ? records : [];
  const safe = list.map(sanitizeRecord);
  const json = JSON.stringify(safe, null, 2);
  const approxBytes = Buffer.byteLength(json, 'utf8');
  if (approxBytes > 10 * 1024 * 1024) {
    console.warn('Search: index size is large (', Math.round(approxBytes / (1024 * 1024)), 'MB ). Consider narrowing sources.');
  }
  await fsp.writeFile(idxPath, json, 'utf8');
}

// Compatibility: keep ensureResultTemplate as a no-op builder (template unused by React search)
async function ensureResultTemplate() {
  try { const { path } = require('./common'); const p = path.join(OUT_DIR, 'search-result.html'); await fsp.writeFile(p, '', 'utf8'); } catch (_) {}
}

module.exports = { ensureSearchRuntime, ensureResultTemplate, buildSearchPage, writeSearchIndex };
