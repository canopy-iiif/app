import React from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from '../../ui/dist/index.mjs';
import Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

function broadcastLeafletReady() {
  let updated = false;
  try {
    if (typeof globalThis !== 'undefined' && !globalThis.L) {
      globalThis.L = Leaflet;
      updated = true;
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && !window.L) {
      window.L = Leaflet;
      updated = true;
    }
  } catch (_) {}
  if (updated && typeof document !== 'undefined') {
    try {
      document.dispatchEvent(new CustomEvent('canopy:leaflet-ready'));
    } catch (_) {
      const evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('canopy:leaflet-ready', false, false, {});
      document.dispatchEvent(evt);
    }
  }
}

broadcastLeafletReady();

function ready(fn) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function parseProps(el) {
  try {
    const script = el.querySelector('script[type="application/json"]');
    if (script) return JSON.parse(script.textContent || '{}');
    const raw = el.getAttribute('data-props') || '{}';
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function mount(el) {
  try {
    if (!el || el.getAttribute('data-canopy-map-mounted') === '1') return;
    const props = parseProps(el);
    const script = el.querySelector('script[type="application/json"]');
    if (script && script.parentNode === el) {
      script.parentNode.removeChild(script);
    }
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    const root = createRoot(el);
    root.render(React.createElement(Map, props));
    el.setAttribute('data-canopy-map-mounted', '1');
  } catch (error) {
    try {
      console.warn('[canopy][map] failed to mount map', error);
    } catch (_) {}
  }
}

function scan() {
  try {
    document
      .querySelectorAll('[data-canopy-map]:not([data-canopy-map-mounted="1"])')
      .forEach(mount);
  } catch (_) {}
}

function observe() {
  try {
    const obs = new MutationObserver((mutations) => {
      const toMount = [];
      mutations.forEach((mutation) => {
        mutation.addedNodes &&
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches && node.matches('[data-canopy-map]')) toMount.push(node);
            const inner = node.querySelectorAll
              ? node.querySelectorAll('[data-canopy-map]')
              : [];
            inner && inner.forEach && inner.forEach((el) => toMount.push(el));
          });
      });
      if (toMount.length) Promise.resolve().then(() => toMount.forEach(mount));
    });
    obs.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  } catch (_) {}
}

ready(() => {
  if (typeof document === 'undefined') return;
  scan();
  observe();
});
