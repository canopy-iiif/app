import React from 'react';
import bibliography from '../../../lib/components/bibliography.js';

function resolveHeadingTag(tag, fallback) {
  if (typeof tag === 'string' && tag.trim()) return tag;
  if (typeof tag === 'function') return tag;
  return fallback;
}

function NoteBody({ note }) {
  if (!note) return null;
  if (note.html) {
    return (
      <div
        className="biblography__note-body"
        dangerouslySetInnerHTML={{ __html: note.html }}
      />
    );
  }
  if (note.text) {
    return <div className="biblography__note-body">{note.text}</div>;
  }
  return null;
}

export default function Biblography({
  className = '',
  pageHeadingTag = 'h3',
} = {}) {
  let entries = [];
  try {
    entries = bibliography?.getBibliographyEntries?.() || [];
  } catch (_) {
    entries = [];
  }
  if (!entries.length) return null;

  const PageHeadingTag = resolveHeadingTag(pageHeadingTag, 'h3');
  const rootClass = ['biblography', className].filter(Boolean).join(' ');

  return (
    <section className={rootClass}>
      <div className="biblography__pages">
        {entries.map((entry) => {
          const key = entry.href || entry.relativePath || entry.title;
          const pageTitle = entry.title || entry.href;
          return (
            <article key={key} className="biblography__page">
              <header className="biblography__page-header">
                {pageTitle ? (
                  <PageHeadingTag className="biblography__page-title">
                    {pageTitle}
                  </PageHeadingTag>
                ) : null}
                {entry.href ? (
                  <a className="biblography__page-link" href={entry.href}>
                    {entry.href}
                  </a>
                ) : null}
              </header>
              <ol className="biblography__notes">
                {(entry.footnotes || []).map((note, idx) => {
                  const noteKey = `${key || 'entry'}-${note.identifier || idx}`;
                  return (
                    <li key={noteKey} className="biblography__note">
                      {note.identifier ? (
                        <span className="biblography__note-label">{note.identifier}</span>
                      ) : null}
                      <NoteBody note={note} />
                    </li>
                  );
                })}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
}
