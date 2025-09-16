import React from 'react';

export function Fallback({ name, ...props }) {
  const style = {
    padding: '0.75rem 1rem',
    border: '1px dashed #d1d5db',
    color: '#6b7280',
    borderRadius: 6,
    background: '#f9fafb',
    fontSize: 14,
  };
  return (
    <div style={style} data-fallback-component={name || 'Unknown'}>
      <strong>{name || 'Unknown component'}</strong> not available in UI.
    </div>
  );
}

