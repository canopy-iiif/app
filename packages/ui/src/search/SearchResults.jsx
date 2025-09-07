import React from 'react';
import Grid, { GridItem } from '../layout/Grid.jsx';

function WorkContent({ href, title, thumbnail }) {
  return (
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
  );
}

function PageContent({ href, title }) {
  return <a href={href}>{title || href}</a>;
}

export default function SearchResults({ results = [], type = 'all', layout = 'grid' }) {
  if (!results.length) {
    return (
      <div className="text-slate-600">
        <em>No results</em>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <ul id="search-results" className="space-y-3">
        {results.map((r, i) => (
          r.type === 'work' ? (
            <li key={i} className="search-result work">
              <WorkContent href={r.href} title={r.title} thumbnail={r.thumbnail} />
            </li>
          ) : (
            <li key={i} className="search-result page">
              <PageContent href={r.href} title={r.title} />
            </li>
          )
        ))}
      </ul>
    );
  }

  // Default: grid (masonry)
  return (
    <div id="search-results">
      <Grid>
        {results.map((r, i) => (
          <GridItem key={i} className={`search-result ${r.type}`}>
            {r.type === 'work' ? (
              <WorkContent href={r.href} title={r.title} thumbnail={r.thumbnail} />
            ) : (
              <PageContent href={r.href} title={r.title} />
            )}
          </GridItem>
        ))}
      </Grid>
    </div>
  );
}
