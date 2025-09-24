import React from 'react';

// SSR placeholder for teaser results panel; the runtime controls visibility and content.
export default function SearchPanelTeaserResults(props = {}) {
  const { style } = props || {};
  const baseStyle = {
    display: 'none',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 'calc(100% + 4px)',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
    zIndex: 1000,
    overflow: 'auto',
    maxHeight: '60vh',
  };
  return (
    <div data-canopy-command-panel style={{ ...baseStyle, ...(style || {}) }}>
      <div id="cplist" />
    </div>
  );
}

