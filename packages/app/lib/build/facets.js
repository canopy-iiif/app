
const { logLine } = require('./log');

async function generateFacets(combined) {
  try {
    const { loadConfig } = require('./iiif');
    const searchBuild = require('./search');
    const cfg = await loadConfig();
    const labels = Array.isArray(cfg && cfg.metadata) ? cfg.metadata : [];
    await searchBuild.buildFacetsForWorks(combined, labels);
    await searchBuild.writeFacetCollections(labels, combined);
    await searchBuild.writeFacetsSearchApi();
    try { logLine('✓ Facets generated', 'cyan'); } catch (_) {}
  } catch (e) {
    try { logLine('! Facets generation skipped', 'yellow'); } catch (_) {}
  }
}

module.exports = { generateFacets };
