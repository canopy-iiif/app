import React, { useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchFormUI, SearchResultsUI } from '@canopy-iiif/ui';

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
      const Flex = (window && window.FlexSearch) || (await import('flexsearch')).default;
      const data = await fetch('./api/search-index.json').then((r) => r.ok ? r.json() : []);
      const idx = new Flex.Index({ tokenize: 'forward' });
      data.forEach((rec, i) => { try { idx.add(i, rec && rec.title ? String(rec.title) : ''); } catch (_) {} });
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
  if (loading) return <div className="text-slate-600">Loading…</div>;
  return <SearchResultsUI results={results} type={type} />;
}
function SummaryMount() {
  const { query, type, shown, total } = useStore();
  const text = useMemo(() => {
    if (!query) return `Showing ${shown} of ${total} items`;
    return `Found ${shown} in ${type === 'all' ? 'all types' : type} for "${query}"`;
  }, [query, type, shown, total]);
  return <div className="text-sm text-slate-600">{text}</div>;
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
      // Surface helpful diagnostics in dev
      try { console.error('[Search] mount error at', selector, e && e.message ? e.message : e, e && e.stack ? e.stack : ''); } catch (_) {}
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
