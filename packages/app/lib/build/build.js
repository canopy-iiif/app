const {
  fs,
  fsp,
  path,
  CONTENT_DIR,
  OUT_DIR,
  ensureDirSync,
  cleanDir,
} = require("../common");
const mdx = require("./mdx");
const iiif = require("./iiif");
const pages = require("./pages");
const searchBuild = require("./search");
const { buildSearchIndex } = require("./search-index");
const runtimes = require("./runtimes");
const { writeSitemap } = require("./sitemap");
const {
  ensureSearchInitialized,
  finalizeSearch,
} = require("./search-workflow");
const { ensureStyles } = require("./styles");
const { copyAssets } = require("./assets");
const { logLine } = require("./log");
const navigation = require("../components/navigation");
const referenced = require("../components/referenced");

// hold records between builds if skipping IIIF
let iiifRecordsCache = [];
let pageRecords = [];

async function ensureNoJekyllMarker() {
  try {
    await fsp.mkdir(OUT_DIR, { recursive: true });
    const markerPath = path.join(OUT_DIR, '.nojekyll');
    await fsp.writeFile(markerPath, '', 'utf8');
  } catch (_) {}
}

async function build(options = {}) {
  const skipIiif = !!(options?.skipIiif || process.env.CANOPY_SKIP_IIIF === '1' || process.env.CANOPY_SKIP_IIIF === 'true');
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("No content directory found at", CONTENT_DIR);
    process.exit(1);
  }

  /**
   * Clean and prepare output directory
   */
  logLine("\nClean and prepare directories", "magenta", {
    bright: true,
    underscore: true,
  });
  logLine("• Reset MDX cache", "blue", { dim: true });
  mdx?.resetMdxCaches();
  navigation?.resetNavigationCache?.();
  referenced?.resetReferenceIndex?.();
  if (!skipIiif) {
    await cleanDir(OUT_DIR);
    await ensureNoJekyllMarker();
    logLine(`• Cleaned output directory`, "blue", { dim: true });
  } else {
    logLine("• Retaining cache (skipping IIIF rebuild)", "blue", { dim: true });
  }
  if (skipIiif) {
    await ensureNoJekyllMarker();
  }

  /**
   * Build IIIF Collection content from configured source(s).
   * This includes building IIIF manifests for works and collections,
   * as well as collecting search records for works.
   */
  logLine("\nBuild IIIF Collection content", "magenta", {
    bright: true,
    underscore: true,
  });
  let iiifRecords = [];
  const CONFIG = await iiif.loadConfig();
  if (!skipIiif) {
    const results = await iiif.buildIiifCollectionPages(CONFIG);
    iiifRecords = results?.iiifRecords;
    iiifRecordsCache = Array.isArray(iiifRecords) ? iiifRecords : [];
  } else {
    iiifRecords = Array.isArray(iiifRecordsCache) ? iiifRecordsCache : [];
    logLine(
      `• Reusing cached IIIF search records (${iiifRecords.length})`,
      "blue",
      { dim: true }
    );
  }
  // Ensure any configured featured manifests are cached (and thumbnails computed)
  // so SSR interstitials can resolve items even if they are not part of
  // the traversed collection or when IIIF build is skipped during incremental rebuilds.
  try { await iiif.ensureFeaturedInCache(CONFIG); } catch (_) {}
  try { await iiif.rebuildManifestIndexFromCache(); } catch (_) {}

  /**
   * Build contextual MDX content from the content directory.
   * This includes collecting page metadata for sitemap and search index,
   * as well as building all MDX pages to HTML.
   */
  logLine("\nBuild contextual content from Markdown pages", "magenta", {
    bright: true,
    underscore: true,
  });
  // Interstitials read directly from the local IIIF cache; no API file needed
  pageRecords = await searchBuild.collectMdxPageRecords();
  await pages.buildContentTree(CONTENT_DIR, pageRecords);
  logLine("✓ MDX pages built", "green");

  /**
   * Build search index from IIIF and MDX records, then build or update
   * the search.html page and search runtime bundle.
   * This is done after all content is built so that the index is comprehensive.
   */
  logLine("\nCreate search indices", "magenta", {
    bright: true,
    underscore: true,
  });
  try {
    await ensureSearchInitialized();
    const combined = await buildSearchIndex(iiifRecords, pageRecords);
    await finalizeSearch(combined);
  } catch (e) {
    logLine("✗ Search index creation failed", "red", { bright: true });
    logLine("  " + String(e), "red");
  }

  /**
   * Generate a sitemap so static hosts can discover every rendered page.
   */
  logLine("\nWrite sitemap", "magenta", {
    bright: true,
    underscore: true,
  });
  try {
    await writeSitemap(iiifRecords, pageRecords);
  } catch (e) {
    logLine("✗ Failed to write sitemap.xml", "red", { bright: true });
    logLine("  " + String(e), "red");
  }

  // No-op: Featured API file no longer written (SSR reads from cache directly)

  /**
   * Prepare client runtimes (e.g. search) by bundling with esbuild.
   * This is done early so that MDX content can reference runtime assets if needed.
   */
  logLine("\nPrepare client runtimes and stylesheets", "magenta", {
    bright: true,
    underscore: true,
  });
  if (!process.env.CANOPY_SKIP_STYLES) {
    await ensureStyles();
    logLine("✓ Wrote styles.css", "cyan");
  }
  await runtimes.prepareAllRuntimes();

  /**
   * Copy static assets from the assets directory to the output directory.
   */
  logLine("\nCopy static assets", "magenta", {
    bright: true,
    underscore: true,
  });
  await copyAssets();

}

module.exports = { build };

if (require.main === module) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
