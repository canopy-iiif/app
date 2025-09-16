import React from 'react';

// SSR-safe placeholder for the command palette. The real UI mounts client-side.
export default function MdxCommandPalette(props = {}) {
  const {
    placeholder = 'Search…',
    hotkey = 'mod+k',
    maxResults = 8,
    groupOrder = ['work', 'page'],
    button = true,
    buttonLabel = 'Search',
  } = props || {};

  const data = { placeholder, hotkey, maxResults, groupOrder };
  return (
    <div data-canopy-command>
      {/* Optional trigger button shown in the header layout */}
      {button && (
        <button
          type="button"
          data-canopy-command-trigger
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
          aria-label="Open search"
        >
          <span aria-hidden>⌘K</span>
          <span className="sr-only">{buttonLabel}</span>
        </button>
      )}
      <script type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    </div>
  );
}

