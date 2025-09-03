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
  await esbuild.build({
    entryPoints: [entry],
    outfile: outFile,
    platform: 'browser',
    format: 'iife',
    bundle: true,
    sourcemap: true,
    target: ['es2018'],
    logLevel: 'silent',
    external: ['react', 'react-dom', 'react-dom/client', 'flexsearch'],
    banner: {
      js: "try{var React=window.React;var ReactDOM=window.ReactDOM;var ReactDOMClient=window.ReactDOMClient;}catch(e){}",
    },
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
    // Minimal mount container; React app handles UI
    let content = React.createElement(
      'div',
      null,
      React.createElement('h1', null, 'Search'),
      React.createElement('div', { id: 'search-root' })
    );

    // Wrap with App and MDX provider for consistent shell and base-aware anchors
    let MDXProvider = null;
    try { const mod = await import('@mdx-js/react'); MDXProvider = mod.MDXProvider || mod.default || null; } catch (_) { MDXProvider = null; }
    const Anchor = function A(props) {
      let { href = '', ...rest } = props || {};
      href = withBase(href);
      return React.createElement('a', { href, ...rest }, props.children);
    };
    let uiComponents = {};
    try { uiComponents = await import('@canopy-iiif/ui'); } catch (_) { uiComponents = {}; }
    let IIIFCard = null; try { IIIFCard = require('./components/IIIFCard'); } catch (_) { IIIFCard = null; }
    const compMap = { ...uiComponents, a: Anchor };
    if (IIIFCard) compMap.IIIFCard = IIIFCard;
    const { loadAppWrapper } = require('./mdx');
    const app = await loadAppWrapper();
    const wrappedApp = app && app.App ? React.createElement(app.App, null, content) : content;
    const page = MDXProvider ? React.createElement(MDXProvider, { components: compMap }, wrappedApp) : wrappedApp;
    let body = ReactDOMServer.renderToStaticMarkup(page);
    const head = app && app.Head ? ReactDOMServer.renderToStaticMarkup(React.createElement(app.Head)) : '';
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
