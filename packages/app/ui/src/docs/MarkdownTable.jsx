import React from 'react';

export default function MarkdownTable({ className = '', ...rest }) {
  const merged = ['markdown-table', className].filter(Boolean).join(' ');
  return (
    <div className="markdown-table__frame">
      <table className={merged} {...rest} />
    </div>
  );
}
