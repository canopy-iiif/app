import React from 'react';

export default function SearchForm({ query, onQueryChange, type = 'all', onTypeChange, types = [] }) {
  const allTypes = Array.from(new Set(['all', ...types]));
  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
      <input
        id="search-input"
        type="search"
        value={query}
        placeholder="Type to search…"
        onChange={(e) => onQueryChange && onQueryChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
      />
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <label htmlFor="search-type">Type:</label>
        <select
          id="search-type"
          value={type}
          onChange={(e) => onTypeChange && onTypeChange(e.target.value)}
          className="px-2 py-1 border border-slate-300 rounded-md bg-white"
        >
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

