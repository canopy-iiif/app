import React from 'react';

function WorkItem({ href, title, thumbnail }) {
  return (
    <li className="search-result work">
      <a href={href} className="card">
        <figure style={{ margin: 0 }}>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title || ''}
              loading="lazy"
              style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 4 }}
            />
          ) : null}
          <figcaption style={{ marginTop: 8 }}>
            <strong>{title || href}</strong>
          </figcaption>
        </figure>
      </a>
    </li>
  );
}

function PageItem({ href, title }) {
  return (
    <li className="search-result page">
      <a href={href}>{title || href}</a>
    </li>
  );
}

export default function SearchResults({ results = [], type = 'all' }) {
  if (!results.length) {
    return <div className="text-slate-600"><em>No results</em></div>;
  }
  return (
    <ul id="search-results" className="space-y-3">
      {results.map((r, i) =>
        r.type === 'work' ? (
          <WorkItem key={i} href={r.href} title={r.title} thumbnail={r.thumbnail} />
        ) : (
          <PageItem key={i} href={r.href} title={r.title} />
        )
      )}
    </ul>
  );
}

