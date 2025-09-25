import React, { useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchResultsUI, SearchTabsUI } from '@canopy-iiif/app/ui';

// Lightweight IndexedDB utilities (no deps) with graceful fallback
function hasIDB() {
  try { return typeof indexedDB !== 'undefined'; } catch (_) { return false; }
}
function idbOpen() {
  return new Promise((resolve, reject) => {
    if (!hasIDB()) return resolve(null);
    try {
      const req = indexedDB.open('canopy-search', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('indexes')) db.createObjectStore('indexes', { keyPath: 'version' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) { resolve(null); }
  });
}
async function idbGet(store, key) {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const st = tx.objectStore(store);
      const req = st.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (_) { resolve(null); }
  });
}
async function idbPut(store, value) {
  const db = await idbOpen();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      const st = tx.objectStore(store);
      st.put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_) { resolve(false); }
  });
}
async function idbPruneOld(store, keepKey) {
  const db = await idbOpen();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      const st = tx.objectStore(store);
      const req = st.getAllKeys();
      req.onsuccess = () => {
        try { (req.result || []).forEach((k) => { if (k !== keepKey) st.delete(k); }); } catch (_) {}
        resolve(true);
      };
      req.onerror = () => resolve(false);
    } catch (_) { resolve(false); }
  });
}
async function sha256Hex(str) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(str);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) {}
  // Fallback: simple non-crypto hash
  try {
    let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  } catch (_) { return String(str && str.length ? str.length : 0); }
}

function createSearchStore() {
  let state = {
    query: new URLSearchParams(location.search).get('q') || '',
    type: new URLSearchParams(location.search).get('type') || 'all',
    loading: true,
    records: [],
    types: [],
    index: null,
    counts: {},
  };
  const listeners = new Set();
  function notify() { listeners.forEach((fn) => { try { fn(); } catch (_) {} }); }
  // Keep a memoized snapshot so getSnapshot returns stable references
  let snapshot = null;
  function recomputeSnapshot() {
    const { index, records, query, type } = state;
    let base = [];
    let results = [];
    let totalForType = Array.isArray(records) ? records.length : 0;
    let counts = {};
    if (records && records.length) {
      if (!query) {
        base = records;
      } else {
        try { const ids = index && index.search(query, { limit: 200 }) || []; base = ids.map((i) => records[i]).filter(Boolean); } catch (_) { base = []; }
      }
      // Build per-type counts from base (query-filtered or all)
      try {
        counts = base.reduce((acc, r) => {
          const t = String((r && r.type) || 'page').toLowerCase();
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {});
      } catch (_) { counts = {}; }
      // Derive results for current tab
      results = type === 'all' ? base : base.filter((r) => String(r.type).toLowerCase() === String(type).toLowerCase());
      // Compute total relative to active tab (unfiltered by query)
      if (type !== 'all') {
        try { totalForType = records.filter((r) => String(r.type).toLowerCase() === String(type).toLowerCase()).length; } catch (_) {}
      }
    }
    snapshot = { ...state, results, total: totalForType, shown: results.length, counts };
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
      let bc = null;
      try { if (typeof BroadcastChannel !== 'undefined') bc = new BroadcastChannel('canopy-search'); } catch (_) {}
      // Try to load meta for cache-busting and tab order; fall back to hash of JSON
      let version = '';
      let tabsOrder = [];
      try {
        const meta = await fetch('./api/index.json').then((r) => (r && r.ok ? r.json() : null)).catch(() => null);
        if (meta && typeof meta.version === 'string') version = meta.version;
        const ord = meta && meta.search && meta.search.tabs && Array.isArray(meta.search.tabs.order) ? meta.search.tabs.order : [];
        tabsOrder = ord.map((s) => String(s)).filter(Boolean);
      } catch (_) {}
      const res = await fetch('./api/search-index.json' + (version ? `?v=${encodeURIComponent(version)}` : ''));
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
          } catch (_) { hydrated = false; }
        }
      } catch (_) { /* no-op */ }

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
          console.info(`[Search] Index built in ${Math.round(t1 - t0)}ms (records=${data.length}) v=${String(version).slice(0,8)}`);
        }
      } else if (DEBUG) {
        const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        // eslint-disable-next-line no-console
        console.info(`[Search] Index imported from IndexedDB in ${Math.round(t1 - t0)}ms v=${String(version).slice(0,8)}`);
      }
      // Optional: debug-listen for install events from other tabs
      try {
        if (bc && DEBUG) {
          bc.onmessage = (ev) => {
            try {
              const msg = ev && ev.data;
              if (msg && msg.type === 'search-index-installed' && msg.version && msg.version !== version) {
                // eslint-disable-next-line no-console
                console.info('[Search] Another tab installed version', String(msg.version).slice(0,8));
              }
            } catch (_) {}
          };
        }
      } catch (_) {}

      const ts = Array.from(new Set(data.map((r) => String((r && r.type) || 'page'))));
      const order = Array.isArray(tabsOrder) && tabsOrder.length ? tabsOrder : ['work', 'docs', 'page'];
      ts.sort((a, b) => { const ia = order.indexOf(a); const ib = order.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib) || a.localeCompare(b); });
      // Default to configured first tab if no type param present
      try {
        const p = new URLSearchParams(location.search);
        const hasType = p.has('type');
        if (!hasType) {
          let def = (order && order.length ? order[0] : 'all');
          if (!ts.includes(def)) def = ts[0] || 'all';
          if (def && def !== 'all') {
            p.set('type', def);
            history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
          }
          set({ type: def });
        }
      } catch (_) {}
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

function ResultsMount(props = {}) {
  const { results, type, loading } = useStore();
  if (loading) return <div className="text-slate-600">Loading…</div>;
  const layout = (props && props.layout) || 'grid';
  return <SearchResultsUI results={results} type={type} layout={layout} />;
}
function TabsMount() {
  const { type, setType, types, counts } = useStore();
  return <SearchTabsUI type={type} onTypeChange={setType} types={types} counts={counts} />;
}
function SummaryMount() {
  const { query, type, shown, total } = useStore();
  const text = useMemo(() => {
    if (!query) return `Showing ${shown} of ${total} items`;
    return `Found ${shown} of ${total} in ${type === 'all' ? 'all types' : type} for "${query}"`;
  }, [query, type, shown, total]);
  return <div className="text-sm text-slate-600">{text}</div>;
}

function parseProps(el) {
  try {
    const s = el.querySelector('script[type="application/json"]');
    if (s) return JSON.parse(s.textContent || '{}');
  } catch (_) {}
  return {};
}

function bindSearchInputToStore() {
  if (!store || typeof document === 'undefined') return;
  try {
    const input = document.querySelector('[data-canopy-command-input]');
    if (!input || input.dataset.canopySearchSync === '1') return;
    input.dataset.canopySearchSync = '1';

    const syncFromStore = () => {
      try {
        const snap = store.getSnapshot();
        const nextVal = (snap && typeof snap.query === 'string') ? snap.query : '';
        if (input.value !== nextVal) input.value = nextVal;
      } catch (_) {}
    };

    const onInput = (event) => {
      try {
        const val = event && event.target && typeof event.target.value === 'string' ? event.target.value : '';
        const current = (() => {
          try {
            const snap = store.getSnapshot();
            return snap && typeof snap.query === 'string' ? snap.query : '';
          } catch (_) {
            return '';
          }
        })();
        if (val === current) return;
        store.setQuery(val);
      } catch (_) {}
    };

    input.addEventListener('input', onInput);
    const unsubscribe = store.subscribe(syncFromStore);
    syncFromStore();

    const cleanup = () => {
      try { input.removeEventListener('input', onInput); } catch (_) {}
      try { if (typeof unsubscribe === 'function') unsubscribe(); } catch (_) {}
    };
    window.addEventListener('beforeunload', cleanup, { once: true });
  } catch (_) {}
}

function mountAt(selector, Comp) {
  const nodes = document.querySelectorAll(selector);
  nodes.forEach((n) => {
    try {
      const root = createRoot(n);
      const props = parseProps(n);
      root.render(<Comp {...props} />);
    } catch (e) {
      // Surface helpful diagnostics in dev
      try { console.error('[Search] mount error at', selector, e && e.message ? e.message : e, e && e.stack ? e.stack : ''); } catch (_) {}
    }
  });
}

if (typeof document !== 'undefined') {
  const run = () => {
    // Mount tabs and other search UI pieces
    mountAt('[data-canopy-search-tabs]', TabsMount);
    mountAt('[data-canopy-search-results]', ResultsMount);
    mountAt('[data-canopy-search-summary]', SummaryMount);
    bindSearchInputToStore();
    // Total mount removed
    try {
      window.addEventListener('canopy:search:setQuery', (ev) => {
        try {
          const q = ev && ev.detail && typeof ev.detail.query === 'string' ? ev.detail.query : (document.querySelector('[data-canopy-command-input]')?.value || '');
          if (typeof q === 'string') store.setQuery(q);
        } catch (_) {}
      });
    } catch (_) {}
  };
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run, { once: true });
}
