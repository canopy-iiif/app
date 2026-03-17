import { mountImageStory } from '../../ui/dist/index.mjs';

const IMAGE_STORY_SELECTOR = '[data-canopy-image-story]';
const nodeStates = new WeakMap();
const SIZE_EPSILON = 1;

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

function getNodeState(node) {
  if (!node) return null;
  let state = nodeStates.get(node);
  if (!state) {
    state = {
      mounted: false,
      cleanup: null,
      resizeObserver: null,
      pollId: null,
      watching: false,
      props: null,
      lastSize: null,
    };
    nodeStates.set(node, state);
  }
  return state;
}

function disconnectWatchers(state) {
  if (!state) return;
  if (state.resizeObserver) {
    try {
      state.resizeObserver.disconnect();
    } catch (_) {}
    state.resizeObserver = null;
  }
  if (state.pollId && typeof window !== 'undefined') {
    window.clearTimeout(state.pollId);
    state.pollId = null;
  }
  state.watching = false;
}

function destroyNode(node, state) {
  const currentState = state || getNodeState(node);
  if (!currentState) return;
  disconnectWatchers(currentState);
  if (currentState.cleanup) {
    try {
      currentState.cleanup();
    } catch (_) {}
    currentState.cleanup = null;
  }
  currentState.mounted = false;
}

function measureSize(node) {
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  const width = rect?.width || node.offsetWidth || node.clientWidth || 0;
  const height = rect?.height || node.offsetHeight || node.clientHeight || 0;
  return { width, height };
}

function hasUsableSize(node, state) {
  const size = measureSize(node);
  if (!size) return false;
  const usable = size.width > 2 && size.height > 2;
  if (usable && state) {
    state.lastSize = size;
  }
  return usable;
}

function needsSizeRefresh(node, state) {
  if (!node || !state) return false;
  const size = measureSize(node);
  if (!size) return false;
  if (size.width <= 2 || size.height <= 2) {
    return true;
  }
  if (!state.lastSize) {
    state.lastSize = size;
    return true;
  }
  const widthDelta = Math.abs(size.width - state.lastSize.width);
  const heightDelta = Math.abs(size.height - state.lastSize.height);
  if (widthDelta > SIZE_EPSILON || heightDelta > SIZE_EPSILON) {
    state.lastSize = size;
    return true;
  }
  return false;
}

function attemptMount(node, state) {
  if (!node || !state || state.mounted) return false;
  if (!hasUsableSize(node, state)) return false;
  state.mounted = true;
  disconnectWatchers(state);
  const props = state.props || parseProps(node);
  Promise.resolve(mountImageStory(node, props)).then((destroy) => {
    if (typeof destroy === 'function') {
      state.cleanup = destroy;
    } else {
      state.cleanup = null;
    }
  });
  return true;
}

function scheduleWatchers(node, state, tryMount) {
  if (!node || !state || state.watching) return;
  if (typeof window === 'undefined') return;
  state.watching = true;
  if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'function') {
    state.resizeObserver = new window.ResizeObserver(() => {
      if (state.mounted) return;
      tryMount();
    });
    try {
      state.resizeObserver.observe(node);
    } catch (_) {}
  }
  const schedulePoll = () => {
    if (state.mounted) return;
    state.pollId = window.setTimeout(() => {
      state.pollId = null;
      if (!tryMount()) {
        schedulePoll();
      }
    }, 200);
  };
  schedulePoll();
}

function startMountProcess(node) {
  const state = getNodeState(node);
  if (!state) return;
  state.props = parseProps(node);
  const tryMount = () => attemptMount(node, state);
  if (!tryMount()) {
    scheduleWatchers(node, state, tryMount);
  }
}

function mount(node) {
  if (!node) return;
  const state = getNodeState(node);
  if (!state || state.bound) return;
  state.bound = true;
  startMountProcess(node);
}

function remount(node) {
  const state = getNodeState(node);
  if (!state) return;
  state.props = parseProps(node);
  destroyNode(node, state);
  startMountProcess(node);
}

function scan() {
  try {
    document
      .querySelectorAll(IMAGE_STORY_SELECTOR)
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
            if (node.matches && node.matches(IMAGE_STORY_SELECTOR)) {
              toMount.push(node);
            }
            const inner = node.querySelectorAll
              ? node.querySelectorAll(IMAGE_STORY_SELECTOR)
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

function refreshModal(modal) {
  if (!modal || typeof modal.querySelectorAll !== 'function') return;
  const nodes = modal.querySelectorAll(IMAGE_STORY_SELECTOR);
  if (!nodes || !nodes.length) return;
  Array.prototype.forEach.call(nodes, (node) => {
    const state = getNodeState(node);
    if (!state || !state.mounted) return;
    if (needsSizeRefresh(node, state)) {
      remount(node);
    }
  });
}

function handleGalleryModalChange(event) {
  if (!event || typeof document === 'undefined') return;
  const detail = event.detail || {};
  if (detail.state !== 'open') return;
  let modal = detail.modal;
  if (!modal && detail.modalId) {
    modal = document.getElementById(detail.modalId);
  }
  if (modal) {
    refreshModal(modal);
  }
}

function bindGalleryListener() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return;
  }
  window.addEventListener('canopy:gallery:modal-change', handleGalleryModalChange);
}

ready(function onReady() {
  scan();
  observe();
  bindGalleryListener();
});
