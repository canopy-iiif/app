'use strict';

const React = require('react');
const fs = require('fs');
const path = require('path');

// Cache of index/manifests to avoid repeated disk reads during a build
let CACHE = { loaded: false, byId: new Map(), bySlug: new Map() };

function safeReadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function loadIndexOnce() {
  if (CACHE.loaded) return CACHE;
  const idxPath = path.resolve('.cache/iiif/index.json');
  const idx = safeReadJson(idxPath);
  if (idx && Array.isArray(idx.byId)) {
    for (const e of idx.byId) {
      if (!e || e.type !== 'Manifest') continue;
      const id = String(e.id || '');
      const slug = String(e.slug || '');
      const entry = { id, slug, parent: e.parent || '', thumbnail: e.thumbnail || '' };
      if (id) CACHE.byId.set(id, entry);
      if (slug) CACHE.bySlug.set(slug, entry);
    }
  }
  CACHE.loaded = true;
  return CACHE;
}

function readManifestTitle(slug) {
  try {
    const p = path.resolve('.cache/iiif/manifests', `${slug}.json`);
    const m = safeReadJson(p);
    const label = m && m.label;
    if (!label) return null;
    if (typeof label === 'string') return label;
    const keys = Object.keys(label || {});
    if (!keys.length) return null;
    const arr = label[keys[0]];
    if (Array.isArray(arr) && arr.length) return String(arr[0]);
    return null;
  } catch (_) { return null; }
}

function deriveTitleFromSlug(slug) {
  try {
    const s = decodeURIComponent(String(slug || ''));
    return s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || s;
  } catch (_) { return String(slug || ''); }
}

function IIIFCard(props) {
  const { id, slug, href, src, title, subtitle, alt, className, style, ...rest } = props || {};
  const { byId, bySlug } = loadIndexOnce();
  let entry = null;
  if (id && byId.has(String(id))) entry = byId.get(String(id));
  else if (slug && bySlug.has(String(slug))) entry = bySlug.get(String(slug));

  const resolvedSlug = (entry && entry.slug) || (slug ? String(slug) : '');
  const resolvedHref = href || (resolvedSlug ? `/works/${resolvedSlug}.html` : '#');
  const resolvedSrc = src || (entry && entry.thumbnail) || '';
  const resolvedTitle = title || readManifestTitle(resolvedSlug) || deriveTitleFromSlug(resolvedSlug);
  const resolvedAlt = alt || resolvedTitle || '';

  let Card = null;
  try {
    // Load the UI Card component for consistent markup/styles
    const ui = require('@canopy-iiif/ui');
    Card = ui && (ui.Card || ui.default && ui.default.Card) ? (ui.Card || ui.default.Card) : null;
  } catch (_) { Card = null; }

  if (Card) {
    return React.createElement(Card, {
      href: resolvedHref,
      src: resolvedSrc || undefined,
      alt: resolvedAlt,
      title: resolvedTitle,
      subtitle,
      className,
      style,
      ...rest,
    });
  }
  // Fallback minimal markup if UI is unavailable
  return React.createElement(
    'a',
    { href: resolvedHref, className, style, ...rest },
    React.createElement(
      'figure',
      { style: { margin: 0 } },
      resolvedSrc ? React.createElement('img', { src: resolvedSrc, alt: resolvedAlt, loading: 'lazy', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 4 } }) : null,
      React.createElement('figcaption', { style: { marginTop: 8 } },
        resolvedTitle ? React.createElement('strong', { style: { display: 'block' } }, resolvedTitle) : null,
        subtitle ? React.createElement('span', { style: { display: 'block', color: '#6b7280' } }, subtitle) : null,
      )
    )
  );
}

module.exports = IIIFCard;

