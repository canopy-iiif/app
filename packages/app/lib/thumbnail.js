'use strict';

// Note: Do not shorten naming conventions here. Keep things readable and
// semantic. This module deliberately uses full words like "thumbnail" instead
// of abbreviations like "thumb".

// Helper for resolving a representative thumbnail for an IIIF resource.
// Uses @iiif/helpers#createThumbnailHelper to choose an appropriate size.

async function getRepresentativeImage(resource, preferredSize = 1200, unsafe = false) {
  // Fast path: if resource already contains a thumbnail, return it without any helper work
  try {
    const t = resource && resource.thumbnail;
    if (t) {
      const first = Array.isArray(t) ? t[0] : t;
      if (first && (first.id || first['@id'])) {
        return {
          id: String(first.id || first['@id']),
          width: typeof first.width === 'number' ? first.width : undefined,
          height: typeof first.height === 'number' ? first.height : undefined,
        };
      }
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
    if (!result) return null;
    const id = String(result.id || result['@id'] || '');
    const width = typeof result.width === 'number' ? result.width : undefined;
    const height = typeof result.height === 'number' ? result.height : undefined;
    return id ? { id, width, height } : null;
  } catch (_) {
    return null;
  }
}

async function getThumbnail(resource, preferredSize = 1200, unsafe = false) {
  // Prefer embedded thumbnail with available dimensions
  try {
    const t = resource && resource.thumbnail;
    const first = Array.isArray(t) ? t[0] : t;
    if (first && (first.id || first['@id'])) {
      const url = String(first.id || first['@id']);
      const width = typeof first.width === 'number' ? first.width : undefined;
      const height = typeof first.height === 'number' ? first.height : undefined;
      return { url, width, height };
    }
  } catch (_) {}
  // Fall back to helper (unsafe mode only) with timeout
  try {
    const rep = await getRepresentativeImage(resource, preferredSize, unsafe);
    if (rep && (rep.id || rep['@id'])) {
      return {
        url: String(rep.id || rep['@id']),
        width: typeof rep.width === 'number' ? rep.width : undefined,
        height: typeof rep.height === 'number' ? rep.height : undefined,
      };
    }
  } catch (_) {}
  return { url: '' };
}

async function getThumbnailUrl(resource, preferredSize = 1200, unsafe = false) {
  const res = await getThumbnail(resource, preferredSize, unsafe);
  return res && res.url ? String(res.url) : '';
}

module.exports = { getRepresentativeImage, getThumbnail, getThumbnailUrl };

