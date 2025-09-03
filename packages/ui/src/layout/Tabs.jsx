import React from 'react';

function toLabel(type) {
  const t = String(type || '').trim();
  if (!t) return 'Items';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Tabs({ types = ['work', 'docs', 'page'], id = 'search-tabs', className = '' }) {
  const order = ['work', 'docs', 'page'];
  const items = Array.from(new Set(types)).sort((a, b) => {
    const ia = order.indexOf(String(a));
    const ib = order.indexOf(String(b));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a).localeCompare(String(b));
  });
  return (
    <div id={id} className={`tabs ${className}`.trim()}>
      {'|'}
      {items.map((t) => (
        <React.Fragment key={t}>
          {' '}
          <button type="button" id={`search-tab-${t}`} className="tab" data-type={t}>
            {toLabel(t)}
          </button>{' '}
          {'|'}
        </React.Fragment>
      ))}
    </div>
  );
}

