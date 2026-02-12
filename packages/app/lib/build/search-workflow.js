const {
  fs,
  path,
  OUT_DIR,
  getLocaleRouteEntries,
  getDefaultRoute,
  getDefaultLocaleCode,
} = require('../common');
const search = require('../search/search');
const runtimes = require('./runtimes');
const { generateFacets } = require('./facets');
const { logLine } = require('./log');

/**
 * Ensure the search page and its runtime exist on first build.
 * If `search.html` is missing, write an empty index, bundle the initial runtime,
 * and build the page so subsequent steps can update artifacts incrementally.
 */
async function ensureSearchInitialized() {
  const entries = getLocaleRouteEntries('search');
  const defaultEntry = entries.length
    ? entries[0]
    : { locale: getDefaultLocaleCode(), route: getDefaultRoute('search') };
  const rel = search.resolveSearchOutputRelative(defaultEntry.route || '');
  const searchPath = path.join(OUT_DIR, rel);
  const needCreatePage = !fs.existsSync(searchPath);
  if (!needCreatePage) return;
  try { logLine('• Preparing search (initial)...', 'blue', { bright: true }); } catch (_) {}
  // Build result item template (compat no-op) so it can be inlined if needed
  try { await search.ensureResultTemplate(); } catch (_) {}
  try { logLine('  - Writing empty index...', 'blue'); } catch (_) {}
  await search.writeSearchIndex([]);
  try { logLine('  - Writing runtime...', 'blue'); } catch (_) {}
  await runtimes.prepareSearchRuntime(process.env.CANOPY_BUNDLE_TIMEOUT || 10000, 'initial');
  try { logLine('  - Building search page...', 'blue'); } catch (_) {}
  await search.buildSearchPage();
  try { logLine('✓ Created search page', 'cyan'); } catch (_) {}
}

/**
 * After the search index is built, finalize related artifacts:
 * - Generate facets for IIIF works
 * - Re-bundle the search runtime (final)
 * - Rebuild result template and the search page
 * - Log a concise breakdown by type
 */
async function finalizeSearch(combinedRecords) {
  const combined = Array.isArray(combinedRecords) ? combinedRecords : [];
  await generateFacets(combined);
  try { logLine('• Writing search runtime (final)...', 'blue', { bright: true }); } catch (_) {}
  await runtimes.prepareSearchRuntime(process.env.CANOPY_BUNDLE_TIMEOUT || 10000, 'final');
  try { await search.ensureResultTemplate(); } catch (_) {}
  try { logLine('• Updating search page...', 'blue'); } catch (_) {}
  await search.buildSearchPage();
  try { logLine('✓ Search page updated', 'cyan'); } catch (_) {}

  // Itemize counts by type for a clearer summary
  try {
    const counts = new Map();
    for (const r of combined) {
      const t = String((r && r.type) || 'page').toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const parts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t, n]) => `${t}: ${n}`);
    const breakdown = parts.length ? `: ${parts.join(', ')}` : '';
    logLine(`✓ Search index: ${combined.length} total records${breakdown}`, 'cyan');
  } catch (_) {}
}

module.exports = { ensureSearchInitialized, finalizeSearch };
