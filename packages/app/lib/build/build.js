const {
  fs,
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
const {
  ensureSearchInitialized,
  finalizeSearch,
} = require("./search-workflow");
const { ensureStyles } = require("./styles");
const { copyAssets } = require("./assets");
const { logLine } = require("./log");
const { verifyBuildOutput } = require("./verify");

// hold records between builds if skipping IIIF
let iiifRecordsCache = [];
let pageRecords = [];

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
  if (!skipIiif) {
    await cleanDir(OUT_DIR);
    logLine(`• Cleaned output directory`, "blue", { dim: true });
  } else {
    logLine("• Retaining cache (skipping IIIF rebuild)", "blue", { dim: true });
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
  if (!skipIiif) {
    const CONFIG = await iiif.loadConfig();
    const results = await iiif.buildIiifCollectionPages(CONFIG);
    iiifRecords = results?.iiifRecords;
  }

  /**
   * Build contextual MDX content from the content directory.
   * This includes collecting page metadata for sitemap and search index,
   * as well as building all MDX pages to HTML.
   */
  logLine("\nBuild contextual content from Markdown pages", "magenta", {
    bright: true,
    underscore: true,
  });
  // FeaturedHero now reads directly from the local IIIF cache; no API file needed
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

  /**
   * Final verification (checklist)
   */
  try {
    verifyBuildOutput({ outDir: OUT_DIR });
  } catch (e) {
    logLine("✗ Build verification failed", "red", { bright: true });
    logLine(String(e && e.message ? e.message : e), "red");
    process.exit(1);
  }
}

module.exports = { build };

if (require.main === module) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
