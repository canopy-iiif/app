'use strict';

function normalizeBasePath(value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  const cleaned = prefixed.replace(/\/+$/, '');
  return cleaned === '/' ? '' : cleaned;
}

let cachedBasePath = null;

function readBasePath(options = {}) {
  const {force = false} = options;
  if (!force && cachedBasePath !== null) return cachedBasePath;
  const candidates = [];
  try {
    if (typeof window !== 'undefined' && window.CANOPY_BASE_PATH != null) {
      candidates.push(window.CANOPY_BASE_PATH);
    }
  } catch (_) {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.CANOPY_BASE_PATH != null) {
      candidates.push(globalThis.CANOPY_BASE_PATH);
    }
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env.CANOPY_BASE_PATH) {
      candidates.push(process.env.CANOPY_BASE_PATH);
    }
  } catch (_) {}

  for (const candidate of candidates) {
    const normalized = normalizeBasePath(candidate);
    if (normalized || normalized === '') {
      cachedBasePath = normalized;
      return cachedBasePath;
    }
  }

  cachedBasePath = '';
  return cachedBasePath;
}

function withBasePath(href) {
  if (typeof href !== 'string') return href;
  const raw = href.trim();
  if (!raw) return href;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return raw;
  if (!raw.startsWith('/')) return raw;
  const base = readBasePath();
  if (!base || base === '/') return raw;
  if (raw === base || raw.startsWith(`${base}/`)) return raw;
  return `${base}${raw}`;
}

function clearBasePathCache() {
  cachedBasePath = null;
}

module.exports = {
  normalizeBasePath,
  readBasePath,
  withBasePath,
  clearBasePathCache,
};
