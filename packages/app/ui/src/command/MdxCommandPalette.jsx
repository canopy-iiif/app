import React from 'react';
import SearchPanelForm from '../search/SearchPanelForm.jsx';
import SearchPanelTeaserResults from '../search/SearchPanelTeaserResults.jsx';

// SSR-safe placeholder for the command palette, composed from SearchPanel parts.
// This ensures a single JSX source of truth for form/panel markup.
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
      <div className="relative w-full">
        <style>{`.relative[data-canopy-panel-auto='1']:focus-within [data-canopy-command-panel]{display:block}`}</style>
        <SearchPanelForm placeholder={placeholder} buttonLabel={buttonLabel} label={label} searchPath={searchPath} />
        <SearchPanelTeaserResults />
      </div>
      <script type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    </div>
  );
}
