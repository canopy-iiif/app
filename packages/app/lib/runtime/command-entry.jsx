import React from 'react';
import { createRoot } from 'react-dom/client';
import { CommandPaletteApp } from '@canopy-iiif/app/ui';

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}
function parseProps(el) {
  try { const s = el.querySelector('script[type="application/json"]'); if (s) return JSON.parse(s.textContent || '{}'); } catch {}
  return {};
}
function withBase(href) {
  try {
    const bp = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : '';
    if (!bp) return href;
    if (/^https?:/i.test(href)) return href;
    const clean = String(href || '').replace(/^\/+/, '');
    return (bp.endsWith('/') ? bp.slice(0, -1) : bp) + '/' + clean;
  } catch { return href; }
}
function rootBase() { try { const bp = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : ''; return bp && bp.endsWith('/') ? bp.slice(0, -1) : bp; } catch { return ''; } }

ready(async function () {
  const host = document.querySelector('[data-canopy-command]');
  if (!host) return;
  const cfg = parseProps(host) || {};
  let records = [];
  let loading = true;
  try {
    let v = '';
    try { const m = await fetch(rootBase() + '/api/index.json').then((r) => r && r.ok ? r.json() : null).catch(() => null); v = (m && m.version) || ''; } catch {}
    const res = await fetch(rootBase() + '/api/search-index.json' + (v ? ('?v=' + encodeURIComponent(v)) : '')).catch(() => null);
    const j = res && res.ok ? await res.json().catch(() => []) : [];
    records = Array.isArray(j) ? j : ((j && j.records) || []);
    loading = false;
  } catch {}
  const ReactObj = (window && window.React) || null;
  const RDC = (window && window.ReactDOMClient) || null;
  if (!ReactObj || !RDC || !RDC.createRoot) return;
  const root = RDC.createRoot(host);
  const onSelect = (href) => { try { window.location.href = withBase(String(href || '')); } catch {} };
  root.render(React.createElement(CommandPaletteApp, { records, loading, config: cfg, onSelect }));
});
