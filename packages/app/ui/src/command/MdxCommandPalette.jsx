import React from 'react';

// SSR-safe placeholder for the command palette. The real UI mounts client-side.
export default function MdxCommandPalette(props = {}) {
  const {
    placeholder = 'Search…',
    hotkey = 'mod+k',
    maxResults = 8,
    groupOrder = ['work', 'page'],
    button = true, // kept for backward compat; ignored by teaser form
    buttonLabel = 'Search',
    label,
    searchPath = '/search',
  } = props || {};

  const text = typeof label === 'string' && label.trim() ? label.trim() : buttonLabel;
  const data = { placeholder, hotkey, maxResults, groupOrder, label: text, searchPath };
  return (
    <div data-canopy-command className="flex-1 min-w-0">
      {/* Header teaser: input opens dialog on focus; button navigates to search page */}
      <div className="relative w-full">
        <style>{`.relative[data-canopy-panel-auto='1']:focus-within [data-canopy-command-panel]{display:block}`}</style>
        <form action={searchPath} method="get" role="search" className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-300 bg-white/95 backdrop-blur text-slate-700 shadow-sm hover:shadow transition w-full focus-within:ring-2 focus-within:ring-brand-500">
          {/* Left icon */}
          <svg aria-hidden viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-slate-500">
            <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4m-2.5-6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
          </svg>
          {/* Input teaser (opens dialog on focus) */}
          <input
            type="search"
            name="q"
            inputMode="search"
            data-canopy-command-input
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none placeholder:text-slate-400 py-0.5 min-w-0"
            aria-label="Search"
          />
          {/* Right action navigates to search page */}
          <button type="submit" data-canopy-command-link className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700">
            <span>{text}</span>
          </button>
        </form>
        {/* SSR placeholder for results panel; runtime controls visibility */}
        <div data-canopy-command-panel style={{ display: 'none', position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.12)', zIndex: 1000, overflow: 'auto', maxHeight: '60vh' }}>
          <div id="cplist" />
        </div>
      </div>
      <script type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    </div>
  );
}
