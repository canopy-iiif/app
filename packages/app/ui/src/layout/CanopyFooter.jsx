import React from 'react';

export default function CanopyFooter({ className = '', children }) {
  const footerClassName = ['canopy-footer', className].filter(Boolean).join(' ');

  return (
    <footer className={footerClassName}>
      <div className="canopy-footer__inner">{children}</div>
    </footer>
  );
}
