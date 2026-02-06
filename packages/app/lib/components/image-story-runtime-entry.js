import { mountImageStory } from '../../ui/dist/index.mjs';

function ready(fn) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function parseProps(node) {
  try {
    const script = node.querySelector('script[type="application/json"]');
    if (!script) return {};
    const text = script.textContent || '{}';
    return JSON.parse(text) || {};
  } catch (_) {
    return {};
  }
}

function mount(node) {
  if (!node || node.__canopyImageStoryMounted) return;
  try {
    const props = parseProps(node);
    mountImageStory(node, props);
    node.__canopyImageStoryMounted = true;
  } catch (_) {}
}

function scan() {
  try {
    document
      .querySelectorAll('[data-canopy-image-story]')
      .forEach((node) => mount(node));
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
            if (node.matches && node.matches('[data-canopy-image-story]')) {
              toMount.push(node);
            }
            const inner = node.querySelectorAll
              ? node.querySelectorAll('[data-canopy-image-story]')
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

ready(function onReady() {
  scan();
  observe();
});
