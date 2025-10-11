import React from 'react';
import SearchPanelForm, { resolveSearchPath } from '../search/SearchPanelForm.jsx';
import SearchPanelTeaserResults from '../search/SearchPanelTeaserResults.jsx';

// SSR-safe placeholder for the search form modal, composed from SearchPanel parts.
// This ensures a single JSX source of truth for form/panel markup.
export default function MdxSearchFormModal(props = {}) {
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
  const resolvedSearchPath = resolveSearchPath(searchPath);
  const data = { placeholder, hotkey, maxResults, groupOrder, label: text, searchPath: resolvedSearchPath };
  return (
    <div data-canopy-search-form className="flex-1 min-w-0">
      <div className="relative w-full">
        <SearchPanelForm placeholder={placeholder} buttonLabel={buttonLabel} label={label} searchPath={resolvedSearchPath} />
        <SearchPanelTeaserResults />
      </div>
      <script type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    </div>
  );
}
