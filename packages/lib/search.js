const React = require('react');
const ReactDOMServer = require('react-dom/server');
const crypto = require('crypto');
const { path, withBase } = require('./common');
const { ensureDirSync, OUT_DIR, htmlShell, fsp } = require('./common');

const FALLBACK_SEARCH_APP = `import React, { useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchFormUI, SearchResultsUI } from '@canopy-iiif/ui';

function hasIDB(){ try { return typeof indexedDB !== 'undefined'; } catch (_) { return false; } }
function idbOpen(){ return new Promise((resolve)=>{ if(!hasIDB()) return resolve(null); try{ const req = indexedDB.open('canopy-search',1); req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains('indexes')) db.createObjectStore('indexes',{keyPath:'version'}); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>resolve(null);}catch(_){ resolve(null);} }); }
async function idbGet(store,key){ const db = await idbOpen(); if(!db) return null; return new Promise((resolve)=>{ try{ const tx=db.transaction(store,'readonly'); const st=tx.objectStore(store); const req=st.get(key); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>resolve(null);}catch(_){ resolve(null);} }); }
async function idbPut(store,value){ const db = await idbOpen(); if(!db) return false; return new Promise((resolve)=>{ try{ const tx=db.transaction(store,'readwrite'); const st=tx.objectStore(store); st.put(value); tx.oncomplete=()=>resolve(true); tx.onerror=()=>resolve(false);}catch(_){ resolve(false);} }); }
async function idbPruneOld(store,keep){ const db=await idbOpen(); if(!db) return false; return new Promise((resolve)=>{ try{ const tx=db.transaction(store,'readwrite'); const st=tx.objectStore(store); const req=st.getAllKeys(); req.onsuccess=()=>{ try{ (req.result||[]).forEach((k)=>{ if(k!==keep) st.delete(k); }); }catch(_){} resolve(true); }; req.onerror=()=>resolve(false);}catch(_){ resolve(false);} }); }
async function sha256Hex(str){ try{ if(typeof crypto!=='undefined' && crypto.subtle){ const data=new TextEncoder().encode(str); const d=await crypto.subtle.digest('SHA-256',data); return Array.from(new Uint8Array(d)).map((b)=>b.toString(16).padStart(2,'0')).join(''); } }catch(_){} try{ let h=5381; for(let i=0;i<str.length;i++) h=((h<<5)+h)^str.charCodeAt(i); return (h>>>0).toString(16); }catch(_){ return String(str&&str.length?str.length:0); }}

function createSearchStore() {
  let state = {
    query: new URLSearchParams(location.search).get('q') || '',
    type: new URLSearchParams(location.search).get('type') || 'all',
    loading: true,
    records: [],
    types: [],
    index: null,
  };
  const listeners = new Set();
  function notify() { listeners.forEach((fn) => { try { fn(); } catch (_) {} }); }
  // Keep a memoized snapshot so getSnapshot returns stable references
  let snapshot = null;
  function recomputeSnapshot() {
    const { index, records, query, type } = state;
    let results = [];
    if (records && records.length) {
      if (!query) {
        results = records.filter((r) => type === 'all' ? true : String(r.type).toLowerCase() === String(type).toLowerCase());
      } else {
        try { const ids = index && index.search(query, { limit: 200 }) || []; results = ids.map((i) => records[i]).filter(Boolean); } catch (_) { results = []; }
        if (type !== 'all') results = results.filter((r) => String(r.type).toLowerCase() === String(type).toLowerCase());
      }
    }
    snapshot = { ...state, results, total: records.length || 0, shown: results.length };
  }
  function set(partial) { state = { ...state, ...partial }; recomputeSnapshot(); notify(); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function getSnapshot() { return snapshot; }
  // Initialize snapshot
  recomputeSnapshot();
  // init
  (async () => {
    try {
      const DEBUG = (() => { try { const p = new URLSearchParams(location.search); return p.has('searchDebug') || localStorage.CANOPY_SEARCH_DEBUG === '1'; } catch (_) { return false; } })();
      const Flex = (window && window.FlexSearch) || (await import('flexsearch')).default;
      // Broadcast new index installs to other tabs
      let bc = null; try { if (typeof BroadcastChannel !== 'undefined') bc = new BroadcastChannel('canopy-search'); } catch (_) {}
      // Try to get a meta version from ./api/index.json for cache-busting
      let version = '';
      try { const meta = await fetch('./api/index.json').then((r)=>r&&r.ok?r.json():null).catch(()=>null); if (meta && typeof meta.version === 'string') version = meta.version; } catch (_) {}
      const res = await fetch('./api/search-index.json' + (version ? ('?v=' + encodeURIComponent(version)) : ''));
      const text = await res.text();
      const parsed = (() => { try { return JSON.parse(text); } catch { return []; } })();
      const data = Array.isArray(parsed) ? parsed : (parsed && parsed.records ? parsed.records : []);
      if (!version) version = (parsed && parsed.version) || (await sha256Hex(text));

      const idx = new Flex.Index({ tokenize: 'forward' });
      let hydrated = false;
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      try {
        const cached = await idbGet('indexes', version);
        if (cached && cached.exportData) {
          try {
            const dataObj = cached.exportData || {};
            for (const k in dataObj) {
              if (Object.prototype.hasOwnProperty.call(dataObj, k)) {
                try { idx.import(k, dataObj[k]); } catch (_) {}
              }
            }
            hydrated = true;
          } catch (_) {}
        }
      } catch (_) {}
      if (!hydrated) {
        data.forEach((rec, i) => { try { idx.add(i, rec && rec.title ? String(rec.title) : ''); } catch (_) {} });
        try {
          const dump = {};
          try { await idx.export((key, val) => { dump[key] = val; }); } catch (_) {}
          await idbPut('indexes', { version, exportData: dump, ts: Date.now() });
          await idbPruneOld('indexes', version);
          try { if (bc) bc.postMessage({ type: 'search-index-installed', version }); } catch (_) {}
        } catch (_) {}
        if (DEBUG) {
          const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          // eslint-disable-next-line no-console
          console.info('[Search] Index built in ' + Math.round(t1 - t0) + 'ms (records=' + data.length + ') v=' + String(version).slice(0,8));
        }
      } else if (DEBUG) {
        const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        // eslint-disable-next-line no-console
        console.info('[Search] Index imported from IndexedDB in ' + Math.round(t1 - t0) + 'ms v=' + String(version).slice(0,8));
      }
      // Optional: debug-listen for install events from other tabs
      try { if (bc && DEBUG) { bc.onmessage = (ev) => { try { const msg = ev && ev.data; if (msg && msg.type === 'search-index-installed' && msg.version && msg.version !== version) console.info('[Search] Another tab installed version ' + String(msg.version).slice(0,8)); } catch (_) {} }; } } catch (_) {}

      const ts = Array.from(new Set(data.map((r) => String((r && r.type) || 'page'))));
      const order = ['work', 'docs', 'page'];
      ts.sort((a, b) => { const ia = order.indexOf(a); const ib = order.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib) || a.localeCompare(b); });
      set({ index: idx, records: data, types: ts, loading: false });
    } catch (_) { set({ loading: false }); }
  })();
  // API
  function setQuery(q) { set({ query: q }); const u = new URL(location.href); u.searchParams.set('q', q); history.replaceState(null, '', u); }
  function setType(t) { set({ type: t }); const u = new URL(location.href); u.searchParams.set('type', t); history.replaceState(null, '', u); }
  return { subscribe, getSnapshot, setQuery, setType };
}

const store = typeof window !== 'undefined' ? createSearchStore() : null;

function useStore() {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...snap, setQuery: store.setQuery, setType: store.setType };
}

function FormMount() {
  const { query, setQuery, type, setType, types } = useStore();
  return <SearchFormUI query={query} onQueryChange={setQuery} type={type} onTypeChange={setType} types={types} />;
}
function ResultsMount() {
  const { results, type, loading } = useStore();
  if (loading) return <div className=\"text-slate-600\">Loading…</div>;
  return <SearchResultsUI results={results} type={type} />;
}
function SummaryMount() {
  const { query, type, shown, total } = useStore();
  const text = useMemo(() => {
    if (!query) return \`Showing \${shown} of \${total} items\`;
    return \`Found \${shown} in \${type === 'all' ? 'all types' : type} for \"\${query}\"\`;
  }, [query, type, shown, total]);
  return <div className=\"text-sm text-slate-600\">{text}</div>;
}
function TotalMount() {
  const { shown } = useStore();
  return <span>{shown}</span>;
}

function mountAt(selector, Comp) {
  const nodes = document.querySelectorAll(selector);
  nodes.forEach((n) => {
    try {
      const root = createRoot(n);
      root.render(<Comp />);
    } catch (e) {
      try { console.error('[Search] mount error at', selector, e && e.message ? e.message : e); } catch (_) {}
    }
  });
}

if (typeof document !== 'undefined') {
  const run = () => {
    mountAt('[data-canopy-search-form]', FormMount);
    mountAt('[data-canopy-search-results]', ResultsMount);
    mountAt('[data-canopy-search-summary]', SummaryMount);
    mountAt('[data-canopy-search-total]', TotalMount);
  };
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run, { once: true });
}
`;

async function ensureSearchRuntime() {
  const { fs, path } = require('./common');
  ensureDirSync(OUT_DIR);
  let esbuild = null;
  try { esbuild = require('../ui/node_modules/esbuild'); } catch (_) { try { esbuild = require('esbuild'); } catch (_) {} }
  if (!esbuild) { console.warn('Search: skipped bundling (no esbuild)'); return; }
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
          "export const useState = R.useState;\n",
          "export const useMemo = R.useMemo;\n",
          "export const useEffect = R.useEffect;\n",
          "export const useRef = R.useRef;\n",
          "export const useSyncExternalStore = R.useSyncExternalStore;\n",
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
    if (entryExists) {
      await esbuild.build({ entryPoints: [entry], ...commonBuild });
    } else {
      await esbuild.build({
        stdin: { contents: FALLBACK_SEARCH_APP, resolveDir: process.cwd(), loader: 'jsx', sourcefile: 'fallback-search-app.jsx' },
        ...commonBuild,
      });
    }
  } catch (e) {
    console.error('Search: bundle error:', e && e.message ? e.message : e);
    return;
  }
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
    const cssRel = path.relative(path.dirname(outPath), path.join(OUT_DIR, 'styles', 'styles.css')).split(path.sep).join('/');
    const jsAbs = path.join(OUT_DIR, 'scripts', 'search.js');
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
    const meta = { version, records: safe.length, bytes: approxBytes, updatedAt: new Date().toISOString() };
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
