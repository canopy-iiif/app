import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Timeline } from '../../ui/dist/index.mjs';

function ready(fn) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
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
    if (!el || el.getAttribute('data-canopy-timeline-mounted') === '1') return;
    const props = parseProps(el);
    const dataNode = el.querySelector('script[type="application/json"]');
    if (dataNode && dataNode.parentNode === el) {
      dataNode.parentNode.removeChild(dataNode);
    }
    if (el.childElementCount > 0) {
      hydrateRoot(el, React.createElement(Timeline, props));
    } else {
      const root = createRoot(el);
      root.render(React.createElement(Timeline, props));
    }
    el.setAttribute('data-canopy-timeline-mounted', '1');
  } catch (error) {
    try {
      console.warn('[canopy][timeline] failed to mount timeline', error);
    } catch (_) {}
  }
}

function scan() {
  try {
    document
      .querySelectorAll('[data-canopy-timeline]:not([data-canopy-timeline-mounted="1"])')
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
            if (node.matches && node.matches('[data-canopy-timeline]')) toMount.push(node);
            const inner = node.querySelectorAll
              ? node.querySelectorAll('[data-canopy-timeline]')
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
