import React from 'react';
import { createRoot } from 'react-dom/client';

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

const componentLoaders = {
  viewer: () => import('@samvera/clover-iiif/viewer'),
  scroll: () => import('@samvera/clover-iiif/scroll'),
  image: () => import('@samvera/clover-iiif/image'),
};

const componentCache = new Map();

function resolveComponent(key) {
  if (!componentLoaders[key]) return Promise.resolve(null);
  if (!componentCache.has(key)) {
    const loader = componentLoaders[key];
    componentCache.set(
      key,
      loader()
        .then((mod) => {
          if (!mod) return null;
          return mod.default || mod.Viewer || mod.Scroll || mod.Image || mod;
        })
        .catch(() => null)
    );
  }
  return componentCache.get(key);
}

function mountAll(selector, key) {
  try {
    const nodes = document.querySelectorAll(selector);
    if (!nodes || !nodes.length) return;
    const rootApi = typeof createRoot === 'function' ? createRoot : null;
    if (!React || !rootApi) return;
    resolveComponent(key).then((Component) => {
      if (!Component) return;
      nodes.forEach((el) => {
        try {
          if (el.__canopyHydrated) return;
          const props = parseProps(el);
          const root = rootApi(el);
          root.render(React.createElement(Component, props));
          el.__canopyHydrated = true;
        } catch (_) {}
      });
    });
  } catch (_) {}
}

ready(() => {
  mountAll('[data-canopy-viewer]', 'viewer');
  mountAll('[data-canopy-scroll]', 'scroll');
  mountAll('[data-canopy-image]', 'image');
});
