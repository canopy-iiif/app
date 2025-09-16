import { useEffect, useMemo, useRef, useState } from 'react';

// Minimal search hook using FlexSearch to index titles and filter by type.
// Usage: const { results, total, loading, types } = useSearch(query, type);
// - query: string
// - type: string ('all' | 'work' | 'page' | 'docs' | ...)
// Returns:
// - results: array of records { title, href, type, thumbnail? }
// - total: total records in index
// - loading: boolean
// - types: array of available types (sorted)
export function useSearch(query, type) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const indexRef = useRef(null);
  const idToRecRef = useRef([]);
  const [types, setTypes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import('flexsearch').then((mod) => {
      const FlexSearch = mod.default || mod;
      return fetch('./search-index.json')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
        .then((data) => {
          if (cancelled) return;
          const idx = new FlexSearch.Index({ tokenize: 'forward' });
          const idToRec = [];
          data.forEach((rec, i) => {
            try {
              idx.add(i, rec && rec.title ? String(rec.title) : '');
            } catch (_) {}
            idToRec[i] = rec || {};
          });
          const ts = Array.from(
            new Set(data.map((r) => String((r && r.type) || 'page')))
          );
          const order = ['work', 'docs', 'page'];
          ts.sort((a, b) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
          });
          indexRef.current = idx;
          idToRecRef.current = idToRec;
          setRecords(data);
          setTypes(ts);
          setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const all = idToRecRef.current;
    if (!all || !all.length) return [];
    const t = String(type || 'all').toLowerCase();
    if (!query) {
      return all.filter((r) => (t === 'all' ? true : String(r.type).toLowerCase() === t));
    }
    let ids = [];
    try {
      ids = (indexRef.current && indexRef.current.search(query, { limit: 200 })) || [];
    } catch (_) {
      ids = [];
    }
    const out = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      const rec = all[id];
      if (!rec) continue;
      if (t !== 'all' && String(rec.type).toLowerCase() !== t) continue;
      out.push(rec);
    }
    return out;
  }, [query, type, records]);

  return { results, total: records.length || 0, loading, types };
}

