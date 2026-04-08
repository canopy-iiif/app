const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { rootRelativeHref } = require('../common');
const { resolveCanopyConfigPath } = require('../config-path');

const IIIF_MANIFESTS_DIR = path.resolve('.cache/iiif/manifests');
const SLUG_MEMO = new Map();

function firstLabelString(label) {
  if (!label) return 'Untitled';
  if (typeof label === 'string') return label;
  try {
    const keys = Object.keys(label || {});
    if (!keys.length) return 'Untitled';
    const arr = label[keys[0]];
    if (Array.isArray(arr) && arr.length) return String(arr[0]);
  } catch (_) {}
  return 'Untitled';
}

function normalizeIiifId(raw) {
  try {
    const s = String(raw || '');
    if (!/^https?:\/\//i.test(s)) return s;
    const u = new URL(s);
    const entries = Array.from(u.searchParams.entries()).sort(
      (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])
    );
    u.search = '';
    for (const [k, v] of entries) u.searchParams.append(k, v);
    return u.toString();
  } catch (_) {
    return String(raw || '');
  }
}

function equalIiifId(a, b) {
  try {
    const an = normalizeIiifId(a);
    const bn = normalizeIiifId(b);
    if (an === bn) return true;
    const ua = new URL(an);
    const ub = new URL(bn);
    return ua.origin === ub.origin && ua.pathname === ub.pathname;
  } catch (_) {
    return String(a || '') === String(b || '');
  }
}

function readYaml(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return yaml.load(raw) || null;
  } catch (_) {
    return null;
  }
}

function readJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function findSlugByIdFromDiskSync(nid) {
  try {
    if (!fs.existsSync(IIIF_MANIFESTS_DIR)) return null;
    const names = fs.readdirSync(IIIF_MANIFESTS_DIR);
    for (const name of names) {
      if (!name || !name.toLowerCase().endsWith('.json')) continue;
      const fp = path.join(IIIF_MANIFESTS_DIR, name);
      try {
        const obj = readJson(fp);
        const mid = normalizeIiifId(String((obj && (obj.id || obj['@id'])) || ''));
        if (mid && equalIiifId(mid, nid)) return name.replace(/\.json$/i, '');
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

function manifestPathFromSlug(slug) {
  try {
    const normalized = String(slug || '').trim();
    if (!normalized || /[\\/]/.test(normalized)) return '';
    return path.resolve(IIIF_MANIFESTS_DIR, `${normalized}.json`);
  } catch (_) {
    return '';
  }
}

function manifestExistsForSlug(slug) {
  const fp = manifestPathFromSlug(slug);
  if (!fp) return false;
  try {
    return fs.existsSync(fp);
  } catch (_) {
    return false;
  }
}

function readManifestBySlug(slug) {
  const fp = manifestPathFromSlug(slug);
  if (!fp) return null;
  return readJson(fp);
}

function resolveSlugForFeaturedEntry(rawId, byId) {
  if (rawId == null) return null;
  const rawValue = String(rawId).trim();
  if (!rawValue) return null;
  if (!/^https?:\/\//i.test(rawValue) && manifestExistsForSlug(rawValue)) {
    const entry = Array.isArray(byId)
      ? byId.find((candidate) => candidate && candidate.slug === rawValue)
      : null;
    return {slug: rawValue, entry};
  }
  const normalizedId = normalizeIiifId(rawValue);
  if (!normalizedId) return null;
  const memoSlug = SLUG_MEMO.get(normalizedId);
  if (memoSlug && manifestExistsForSlug(memoSlug)) {
    const memoEntry = Array.isArray(byId)
      ? byId.find((candidate) => candidate && candidate.slug === memoSlug)
      : null;
    return {slug: memoSlug, entry: memoEntry};
  }
  const entry = byId.find(
    (candidate) =>
      candidate && candidate.type === 'Manifest' && equalIiifId(candidate.id, normalizedId)
  );
  if (entry && entry.slug && manifestExistsForSlug(entry.slug)) {
    SLUG_MEMO.set(normalizedId, entry.slug);
    return {slug: entry.slug, entry};
  }
  const fallbackSlug = findSlugByIdFromDiskSync(normalizedId);
  if (fallbackSlug && manifestExistsForSlug(fallbackSlug)) {
    SLUG_MEMO.set(normalizedId, fallbackSlug);
    const fallbackEntry = Array.isArray(byId)
      ? byId.find(
          (candidate) =>
            candidate &&
            candidate.type === 'Manifest' &&
            (candidate.slug === fallbackSlug || equalIiifId(candidate.id, normalizedId))
        )
      : null;
    return {slug: fallbackSlug, entry: fallbackEntry};
  }
  return null;
}

function readFeaturedFromCacheSync() {
  try {
    const debug = !!process.env.CANOPY_DEBUG_FEATURED;
    const cfg = readYaml(resolveCanopyConfigPath()) || {};
    const featured = Array.isArray(cfg && cfg.featured) ? cfg.featured : [];
    if (!featured.length) return [];
    const idx = readJson(path.resolve('.cache/iiif/index.json')) || {};
    const byId = Array.isArray(idx && idx.byId) ? idx.byId : [];
    const out = [];
    for (const id of featured) {
      if (debug) { try { console.log('[featured] id:', id); } catch (_) {} }
      const resolved = resolveSlugForFeaturedEntry(id, byId);
      const slug = resolved && resolved.slug ? resolved.slug : '';
      const entry = resolved && resolved.entry ? resolved.entry : null;
      if (debug) { try { console.log('[featured]  - slug:', slug || '(none)'); } catch (_) {} }
      if (!slug) continue;
      const m = readManifestBySlug(slug);
      if (!m) continue;
      const rec = {
        title: firstLabelString(m && m.label),
        href: rootRelativeHref(path.join('works', slug + '.html').split(path.sep).join('/')),
        type: 'work',
      };
      if (entry && entry.heroThumbnail) {
        rec.thumbnail = String(entry.heroThumbnail);
        if (typeof entry.heroThumbnailWidth === 'number') {
          rec.thumbnailWidth = entry.heroThumbnailWidth;
        } else if (typeof entry.thumbnailWidth === 'number') {
          rec.thumbnailWidth = entry.thumbnailWidth;
        }
        if (typeof entry.heroThumbnailHeight === 'number') {
          rec.thumbnailHeight = entry.heroThumbnailHeight;
        } else if (typeof entry.thumbnailHeight === 'number') {
          rec.thumbnailHeight = entry.thumbnailHeight;
        }
        if (entry && entry.heroThumbnailSrcset) {
          rec.srcset = String(entry.heroThumbnailSrcset);
        }
        if (entry && entry.heroThumbnailSizes) {
          rec.sizes = String(entry.heroThumbnailSizes);
        }
      } else {
        if (entry && entry.thumbnail) rec.thumbnail = String(entry.thumbnail);
        if (entry && typeof entry.thumbnailWidth === 'number') rec.thumbnailWidth = entry.thumbnailWidth;
        if (entry && typeof entry.thumbnailHeight === 'number') rec.thumbnailHeight = entry.thumbnailHeight;
      }
      if (!rec.thumbnail) {
        try {
          const t = m && m.thumbnail;
          if (Array.isArray(t) && t.length) {
            const first = t[0] || {};
            const tid = first.id || first['@id'] || first.url || '';
            if (tid) rec.thumbnail = String(tid);
            if (typeof first.width === 'number') rec.thumbnailWidth = first.width;
            if (typeof first.height === 'number') rec.thumbnailHeight = first.height;
          } else if (t && typeof t === 'object') {
            const tid = t.id || t['@id'] || t.url || '';
            if (tid) rec.thumbnail = String(tid);
            if (typeof t.width === 'number') rec.thumbnailWidth = t.width;
            if (typeof t.height === 'number') rec.thumbnailHeight = t.height;
          }
        } catch (_) {}
      }
      out.push(rec);
    }
    if (debug) { try { console.log('[featured] total:', out.length); } catch (_) {} }
    return out;
  } catch (_) {
    return [];
  }
}

module.exports = {
  firstLabelString,
  normalizeIiifId,
  equalIiifId,
  readYaml,
  readJson,
  findSlugByIdFromDiskSync,
  readFeaturedFromCacheSync,
};
