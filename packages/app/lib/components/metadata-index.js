const fs = require('fs');
const path = require('path');

const METADATA_INDEX_PATH = path.resolve('.cache/iiif/metadata-index.json');

let cachedIndex = null;

function readMetadataIndexFromDisk() {
  try {
    if (!fs.existsSync(METADATA_INDEX_PATH)) return [];
    const raw = fs.readFileSync(METADATA_INDEX_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function getMetadataIndex() {
  if (cachedIndex) return cachedIndex;
  cachedIndex = readMetadataIndexFromDisk();
  return cachedIndex;
}

function resetMetadataIndex() {
  cachedIndex = null;
}

module.exports = {
  getMetadataIndex,
  resetMetadataIndex,
};
