import React from 'react';
import { createRoot } from 'react-dom/client';
import CloverSlider from '@samvera/clover-iiif/slider';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { mergeSliderOptions, normalizeSliderOptions } from '../../ui/src/iiif/sliderOptions.js';

function ready(fn) {
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

function withDefaults(rawProps) {
  const props = rawProps && typeof rawProps === 'object' ? rawProps : {};
  const className = ['canopy-slider', props.className]
    .filter(Boolean)
    .join(' ');
  const mergedOptions = mergeSliderOptions(props.options);
  return {
    ...props,
    className,
    options: normalizeSliderOptions(mergedOptions),
  };
}

function mount(el) {
  try {
    if (!el || el.getAttribute('data-canopy-slider-mounted') === '1') return;
    const props = withDefaults(parseProps(el));
    const root = createRoot(el);
    root.render(React.createElement(CloverSlider, props));
    el.setAttribute('data-canopy-slider-mounted', '1');
  } catch (_) {}
}

function scan() {
  try {
    document
      .querySelectorAll('[data-canopy-slider]:not([data-canopy-slider-mounted="1"])')
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
            if (node.matches && node.matches('[data-canopy-slider]')) toMount.push(node);
            const inner = node.querySelectorAll
              ? node.querySelectorAll('[data-canopy-slider]')
              : [];
            inner && inner.forEach && inner.forEach((x) => toMount.push(x));
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

ready(function onReady() {
  scan();
  observe();
});
