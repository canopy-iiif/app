import React from 'react';

export default function MdxSearchForm(props) {
  let json = '{}';
  try { json = JSON.stringify(props || {}); } catch (_) { json = '{}'; }
  return (
    <div data-canopy-search-form="1">
      <script type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
    </div>
  );
}

