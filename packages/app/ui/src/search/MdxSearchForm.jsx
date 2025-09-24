import React from 'react';
import SearchForm from './SearchForm.jsx';

// SSR-rendered SearchForm that also exposes props for the client runtime.
// This ensures a single source of truth for the form markup (SearchForm.jsx).
export default function MdxSearchForm(props = {}) {
  let json = '{}';
  try { json = JSON.stringify(props || {}); } catch (_) { json = '{}'; }
  return (
    <div data-canopy-search-form="1">
      <SearchForm {...props} />
      <script type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
    </div>
  );
}
