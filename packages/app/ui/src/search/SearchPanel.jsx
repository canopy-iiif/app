import React from 'react';
import SearchPanelForm, { resolveSearchPath } from './SearchPanelForm.jsx';
import SearchPanelTeaserResults from './SearchPanelTeaserResults.jsx';

// High-level SearchPanel composed of a teaser form and teaser results panel.
// Encodes configuration as JSON for the client runtime.
export default function SearchPanel(props = {}) {
  const {
    placeholder = 'Search…',
    hotkey = 'mod+k',
    maxResults = 8,
    groupOrder = ['work', 'page'],
    // Kept for backward compat; form always renders submit
    button = true, // eslint-disable-line no-unused-vars
    buttonLabel = 'Search',
    label,
    searchPath = '/search',
  } = props || {};

  const text = typeof label === 'string' && label.trim() ? label.trim() : buttonLabel;
  const resolvedSearchPath = resolveSearchPath(searchPath);
  const data = { placeholder, hotkey, maxResults, groupOrder, label: text, searchPath: resolvedSearchPath };

  return (
    <div data-canopy-command className="flex-1 min-w-0">
      <div className="relative w-full">
        <style>{`.relative[data-canopy-panel-auto='1']:focus-within [data-canopy-command-panel]{display:block}`}</style>
        <SearchPanelForm placeholder={placeholder} buttonLabel={buttonLabel} label={label} searchPath={resolvedSearchPath} />
        <SearchPanelTeaserResults />
      </div>
      <script type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    </div>
  );
}
