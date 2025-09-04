import React from 'react';

// SSR-friendly placeholder for the React Search app.
// The actual app mounts from site/search.js into this element.
export default function Search(props) {
  let json = '{}';
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = '{}';
  }
  return (
    <div data-canopy-search="1">
      <script type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
    </div>
  );
}

