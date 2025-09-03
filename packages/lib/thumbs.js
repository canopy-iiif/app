'use strict';

// Helper for resolving a representative thumbnail URL for an IIIF resource
// Uses @iiif/helpers#createThumbnailHelper to choose an appropriate size.

async function getRepresentativeImage(resource, preferredSize = 1200, unsafe = false) {
  // Fast path: if resource already contains a thumbnail, return it without any helper work
  try {
    const t = resource && resource.thumbnail;
    if (t) {
      const first = Array.isArray(t) ? t[0] : t;
      if (first && (first.id || first['@id'])) return { id: String(first.id || first['@id']) };
    }
  } catch (_) {}

  // Avoid potentially long-running network calls in safe mode
  if (!unsafe) return null;

  // Unsafe mode: attempt helper with a timeout so builds never hang
  try {
    const mod = await import('@iiif/helpers');
    const createThumbnailHelper = mod.createThumbnailHelper || (mod.default && mod.default.createThumbnailHelper);
    if (!createThumbnailHelper) return null;
    const helper = createThumbnailHelper();
    const task = helper.getBestThumbnailAtSize(
      resource,
      { width: preferredSize, height: preferredSize, minWidth: preferredSize, minHeight: preferredSize },
      true,
      [],
      { width: preferredSize, height: preferredSize }
    );
    const timeoutMs = Number(process.env.CANOPY_THUMB_TIMEOUT || 2000);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const result = await Promise.race([task, timeout]);
    return result || null;
  } catch (_) {
    return null;
  }
}

async function getThumbnailUrl(resource, preferredSize = 1200, unsafe = false) {
  // Prefer embedded thumbnails without any extra work
  try {
    const t = resource && resource.thumbnail;
    if (Array.isArray(t) && t.length) {
      const c = t[0];
      if (c && (c.id || c['@id'])) return String(c.id || c['@id']);
    } else if (t && (t.id || t['@id'])) {
      return String(t.id || t['@id']);
    }
  } catch (_) {}
  // Fall back to helper (unsafe mode only) with timeout
  try {
    const rep = await getRepresentativeImage(resource, preferredSize, unsafe);
    if (rep && (rep.id || rep['@id'])) return String(rep.id || rep['@id']);
  } catch (_) {}
  return '';
}

module.exports = { getRepresentativeImage, getThumbnailUrl };
