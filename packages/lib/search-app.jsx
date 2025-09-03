import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchForm, SearchResults, useSearch } from '@canopy-iiif/ui';

function SearchApp() {
  const params = new URLSearchParams(location.search);
  const initialQ = params.get('q') || '';
  const initialType = params.get('type') || 'all';

  const [query, setQuery] = useState(initialQ);
  const [type, setType] = useState(initialType);
  const { results, total, loading, types } = useSearch(query, type);

  const shown = results.length;
  const summary = useMemo(() => {
    if (!query) return `Showing ${shown} of ${total} items`;
    return `Found ${shown} in ${type === 'all' ? 'all types' : type} for "${query}"`;
  }, [query, type, shown, total]);

  return (
    <div className="mx-auto max-w-content w-full px-4 py-6 space-y-4">
      <SearchForm query={query} onQueryChange={setQuery} type={type} onTypeChange={setType} types={types} />
      <div className="text-sm text-slate-600">{summary}</div>
      {loading ? <div className="text-slate-600">Loading…</div> : <SearchResults results={results} type={type} />}
    </div>
  );
}

export function mountSearchApp(el) {
  if (!el) return;
  const root = createRoot(el);
  root.render(<SearchApp />);
}

if (typeof document !== 'undefined') {
  if (document.readyState !== 'loading') {
    const el = document.getElementById('search-root');
    if (el) mountSearchApp(el);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('search-root');
      if (el) mountSearchApp(el);
    });
  }
}

