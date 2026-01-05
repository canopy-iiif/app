const crypto = require('crypto');
const {
  fs,
  fsp,
  path,
  OUT_DIR,
  ensureDirSync,
  rootRelativeHref,
} = require('../common');
const {firstLabelString} = require('./featured');

const NAVPLACE_RELATIVE = path.join('api', 'navplace.json');
const NAVPLACE_PATH = path.join(OUT_DIR, NAVPLACE_RELATIVE);
const NAVPLACE_PUBLIC_HREF = rootRelativeHref(
  NAVPLACE_RELATIVE.split(path.sep).join('/')
);

let cachedSummary = null;

function normalizeStringValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = normalizeStringValue(entry);
      if (text) return text;
    }
    return '';
  }
  if (typeof value === 'object') {
    const label = firstLabelString(value);
    if (label && label !== 'Untitled') return label;
    const keys = Object.keys(value);
    for (const key of keys) {
      const text = normalizeStringValue(value[key]);
      if (text) return text;
    }
  }
  return '';
}

function normalizeCoordinate(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function sanitizeFeature(feature, index, context) {
  if (!feature || typeof feature !== 'object') return null;
  const geometry = feature.geometry || {};
  const geomType = typeof geometry.type === 'string' ? geometry.type : '';
  if (geomType.toLowerCase() !== 'point') return null;
  const coords = Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : [];
  const lng = normalizeCoordinate(coords[0]);
  const lat = normalizeCoordinate(coords[1]);
  if (lat == null || lng == null) return null;
  const properties = feature.properties || {};
  const label = normalizeStringValue(properties.label) || context.title;
  const summary = normalizeStringValue(
    properties.summary || properties.description || properties.note
  );
  const idBase = context.slug || context.id || 'manifest';
  const normalizedId = feature.id
    ? String(feature.id)
    : `${idBase}-point-${index + 1}`;
  return {
    id: normalizedId,
    label: label || context.title,
    summary: summary || context.summary || '',
    lat,
    lng,
  };
}

function collectManifestFeatures(manifest) {
  if (!manifest) return [];
  const navPlace = manifest.navPlace || manifest.navplace;
  if (!navPlace) return [];
  if (Array.isArray(navPlace)) return navPlace;
  if (Array.isArray(navPlace.features)) return navPlace.features;
  if (navPlace.type && navPlace.type.toLowerCase() === 'feature') {
    return [navPlace];
  }
  return [];
}

function buildManifestNavPlaceRecord(options = {}) {
  const manifest = options.manifest || null;
  if (!manifest) return null;
  const rawFeatures = collectManifestFeatures(manifest);
  if (!rawFeatures.length) return null;
  const manifestId = manifest.id || manifest['@id'] || '';
  const title = normalizeStringValue(options.title) || firstLabelString(manifest.label);
  const summary = normalizeStringValue(options.summary) || normalizeStringValue(manifest.summary);
  const slug = options.slug ? String(options.slug) : '';
  const href = options.href ? String(options.href) : '';
  const thumbnail = options.thumbnail ? String(options.thumbnail) : '';
  const thumbWidth =
    typeof options.thumbnailWidth === 'number' ? options.thumbnailWidth : undefined;
  const thumbHeight =
    typeof options.thumbnailHeight === 'number' ? options.thumbnailHeight : undefined;
  const context = {
    id: manifestId,
    slug,
    title: title || 'Untitled',
    summary: summary || '',
  };
  const features = rawFeatures
    .map((feature, index) => sanitizeFeature(feature, index, context))
    .filter(Boolean);
  if (!features.length) return null;
  return {
    id: String(manifestId || slug || context.title || ''),
    slug,
    href,
    title: context.title,
    summary: context.summary,
    thumbnail,
    thumbnailWidth: thumbWidth,
    thumbnailHeight: thumbHeight,
    features,
  };
}

function stableCopy(records) {
  return records
    .map((record) => ({
      ...record,
      features: (record.features || [])
        .slice()
        .sort((a, b) => (a.id || '').localeCompare(b.id || ''))
        .map((feat) => ({
          id: String(feat.id || ''),
          label: feat.label || '',
          summary: feat.summary || '',
          lat: Number(feat.lat),
          lng: Number(feat.lng),
        })),
    }))
    .sort((a, b) => (a.href || '').localeCompare(b.href || ''));
}

function hashRecords(records) {
  try {
    const stable = stableCopy(records);
    const payload = JSON.stringify(stable);
    return crypto.createHash('sha1').update(payload).digest('hex');
  } catch (_) {
    return '';
  }
}

async function removeDataset() {
  cachedSummary = {
    hasFeatures: false,
    version: null,
    href: NAVPLACE_PUBLIC_HREF,
  };
  try {
    await fsp.rm(NAVPLACE_PATH, {force: true});
  } catch (_) {}
  return cachedSummary;
}

async function writeNavPlaceDataset(records = []) {
  const valid = Array.isArray(records)
    ? records.filter((record) => record && record.features && record.features.length)
    : [];
  if (!valid.length) {
    return removeDataset();
  }
  const stable = stableCopy(valid);
  const version = hashRecords(valid);
  const payload = {
    version,
    generatedAt: new Date().toISOString(),
    manifests: stable,
  };
  ensureDirSync(path.dirname(NAVPLACE_PATH));
  await fsp.writeFile(NAVPLACE_PATH, JSON.stringify(payload, null, 2), 'utf8');
  cachedSummary = {
    hasFeatures: true,
    version: version || null,
    href: NAVPLACE_PUBLIC_HREF,
  };
  return cachedSummary;
}

function readSummaryFromDisk() {
  try {
    const raw = fs.readFileSync(NAVPLACE_PATH, 'utf8');
    const data = JSON.parse(raw);
    const hasFeatures = Array.isArray(data.manifests)
      ? data.manifests.some((entry) => entry && entry.features && entry.features.length)
      : false;
    return {
      hasFeatures,
      version: data.version || null,
      href: NAVPLACE_PUBLIC_HREF,
    };
  } catch (_) {
    return {
      hasFeatures: false,
      version: null,
      href: NAVPLACE_PUBLIC_HREF,
    };
  }
}

function getNavPlaceDatasetInfo() {
  if (!cachedSummary) {
    cachedSummary = readSummaryFromDisk();
  }
  return cachedSummary;
}

module.exports = {
  buildManifestNavPlaceRecord,
  writeNavPlaceDataset,
  getNavPlaceDatasetInfo,
  NAVPLACE_PATH,
  NAVPLACE_PUBLIC_HREF,
};
