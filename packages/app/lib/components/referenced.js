const fs = require('fs');
const path = require('path');
const {
  CONTENT_DIR,
  rootRelativeHref,
  buildRouteRelativePath,
  getLocaleRoute,
} = require('../common');
const mdx = require('../build/mdx.js');
const {
  firstLabelString,
  normalizeIiifId,
  equalIiifId,
  readJson,
  findSlugByIdFromDiskSync,
} = require('./featured');

const IIIF_INDEX_PATH = path.resolve('.cache/iiif/index.json');
const IIIF_MANIFESTS_DIR = path.resolve('.cache/iiif/manifests');
let manifestReferenceIndex = null;
let referenceIndexBuilt = false;

function firstTextValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = firstTextValue(entry);
      if (text) return text;
    }
    return '';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    for (const key of keys) {
      const entry = value[key];
      if (Array.isArray(entry)) {
        for (const child of entry) {
          const text = firstTextValue(child);
          if (text) return text;
        }
      } else {
        const text = firstTextValue(entry);
        if (text) return text;
      }
    }
  }
  return '';
}

function normalizeReferencedManifestList(raw) {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const seen = new Set();
  const out = [];
  for (const entry of values) {
    if (entry === undefined || entry === null) continue;
    const normalized = normalizeIiifId(entry);
    const key = normalized || String(entry).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function readManifestBySlug(slug) {
  if (!slug) return null;
  const filename = `${slug}.json`;
  const filePath = path.join(IIIF_MANIFESTS_DIR, filename);
  return readJson(filePath);
}

function assignThumbnailFields(target, entry, manifest) {
  if (!target) return target;
  const heroThumb = entry && entry.heroThumbnail ? String(entry.heroThumbnail) : '';
  const fallbackThumb = entry && entry.thumbnail ? String(entry.thumbnail) : '';
  if (heroThumb) {
    target.thumbnail = heroThumb;
    if (typeof entry.heroThumbnailWidth === 'number') target.thumbnailWidth = entry.heroThumbnailWidth;
    if (typeof entry.heroThumbnailHeight === 'number') target.thumbnailHeight = entry.heroThumbnailHeight;
  } else if (fallbackThumb) {
    target.thumbnail = fallbackThumb;
    if (typeof entry.thumbnailWidth === 'number') target.thumbnailWidth = entry.thumbnailWidth;
    if (typeof entry.thumbnailHeight === 'number') target.thumbnailHeight = entry.thumbnailHeight;
  }
  if (!target.thumbnail && manifest && manifest.thumbnail) {
    const thumb = manifest.thumbnail;
    if (Array.isArray(thumb) && thumb.length) {
      const first = thumb[0] || {};
      const id = first.id || first['@id'] || first.url || '';
      if (id) target.thumbnail = String(id);
      if (typeof first.width === 'number') target.thumbnailWidth = first.width;
      if (typeof first.height === 'number') target.thumbnailHeight = first.height;
    } else if (thumb && typeof thumb === 'object') {
      const id = thumb.id || thumb['@id'] || thumb.url || '';
      if (id) target.thumbnail = String(id);
      if (typeof thumb.width === 'number') target.thumbnailWidth = thumb.width;
      if (typeof thumb.height === 'number') target.thumbnailHeight = thumb.height;
    }
  }
  return target;
}

function buildReferencedItems(referencedIds, options = {}) {
  const ids = normalizeReferencedManifestList(referencedIds);
  if (!ids.length) return [];
  const index = readJson(IIIF_INDEX_PATH) || {};
  const byId = Array.isArray(index.byId) ? index.byId : [];
  const items = [];
  const locale = options && options.locale ? options.locale : null;
  const routeBase = getLocaleRoute(locale, 'works');
  for (const id of ids) {
    const entry = byId.find(
      (candidate) => candidate && candidate.type === 'Manifest' && equalIiifId(candidate.id, id)
    );
    const slug = entry && entry.slug ? entry.slug : findSlugByIdFromDiskSync(id);
    if (!slug) continue;
    const manifest = readManifestBySlug(slug);
    if (!manifest) continue;
    const relPath = buildRouteRelativePath(routeBase, `${slug}.html`);
    const href = rootRelativeHref(relPath.split(path.sep).join('/'));
    const title = firstLabelString(manifest.label);
    const summary = firstTextValue(manifest.summary);
    const item = { id, slug, href, title };
    if (summary) item.summary = summary;
    assignThumbnailFields(item, entry, manifest);
    items.push(item);
  }
  return items;
}

function isReservedContentFile(p) {
  return mdx.isReservedFile ? mdx.isReservedFile(p) : path.basename(p).startsWith('_');
}

function resolveHrefFromContentPath(filePath) {
  const rel = path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
  const htmlRel = rel.replace(/\.mdx$/i, '.html');
  return rootRelativeHref(htmlRel);
}

function buildReferenceIndexSync() {
  const map = new Map();
  function record(filePath) {
    let raw = '';
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (_) {
      return;
    }
    const frontmatter = mdx.parseFrontmatter ? mdx.parseFrontmatter(raw) : { data: null };
    const data = frontmatter && frontmatter.data && typeof frontmatter.data === 'object' ? frontmatter.data : null;
    const ids = normalizeReferencedManifestList(data && data.referencedManifests);
    if (!ids.length) return;
    const title = (data && typeof data.title === 'string' && data.title.trim())
      ? data.title.trim()
      : mdx.extractTitle ? mdx.extractTitle(raw) : path.basename(filePath, path.extname(filePath));
    const href = resolveHrefFromContentPath(filePath);
    const entry = { title, href };
    for (const id of ids) {
      const normalized = normalizeIiifId(id);
      if (!normalized) continue;
      const list = map.get(normalized) || [];
      if (!list.some((item) => item.href === entry.href)) list.push(entry);
      map.set(normalized, list);
    }
  }
  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
      } else if (entry.isFile() && /\.mdx$/i.test(entry.name) && !isReservedContentFile(filePath)) {
        record(filePath);
      }
    }
  }
  walk(CONTENT_DIR);
  for (const [key, list] of map.entries()) {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  manifestReferenceIndex = map;
  referenceIndexBuilt = true;
  return manifestReferenceIndex;
}

function ensureReferenceIndex() {
  if (referenceIndexBuilt && manifestReferenceIndex) return manifestReferenceIndex;
  return buildReferenceIndexSync();
}

function resetReferenceIndex() {
  referenceIndexBuilt = false;
  manifestReferenceIndex = null;
}

function getReferencesForManifest(manifestId) {
  const normalized = normalizeIiifId(manifestId);
  if (!normalized) return [];
  const index = ensureReferenceIndex();
  const list = index.get(normalized) || [];
  return list.map((entry) => ({ ...entry }));
}

module.exports = {
  normalizeReferencedManifestList,
  buildReferencedItems,
  ensureReferenceIndex,
  resetReferenceIndex,
  getReferencesForManifest,
};
