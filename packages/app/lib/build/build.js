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
const search = require("../search/search");
const searchBuild = require("./search");
const { buildSearchIndex } = require("./search-index");
const { generateFacets } = require("./facets");
const runtimes = require("./runtimes");
const { ensureStyles } = require("./styles");
const { copyAssets } = require("./assets");
const { logLine } = require("./log");

// hold records between builds if skipping IIIF
let iiifRecordsCache = [];
let pageRecords = [];

async function build(options = {}) {
  const skipIiif = !!options?.skipIiif;
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("No content directory found at", CONTENT_DIR);
    process.exit(1);
  }

  /**
   * Clean and prepare output directory
   */
  logLine("\n[1/6] Clean and prepare directories", "magenta", {
    bright: true,
  });
  mdx?.resetMdxCaches();
  if (!skipIiif) {
    await cleanDir(OUT_DIR);
    logLine("✓ Cleaned output directory\n", "cyan");
  } else {
    logLine("• Incremental rebuild\n", "blue");
  }

  /**
   * Build IIIF Collection content from configured source(s).
   * This includes building IIIF manifests for works and collections,
   * as well as collecting search records for works.
   */
  logLine("\n[2/6] Build IIIF Collection content", "magenta", {
    bright: true,
  });
  let searchRecords = [];
  if (!skipIiif) {
    const CONFIG = await iiif.loadConfig();
    const res = await iiif.buildIiifCollectionPages(CONFIG);
    searchRecords = Array.isArray(res && res.searchRecords)
      ? res.searchRecords
      : [];
    iiifRecordsCache = searchRecords;
  } else {
    searchRecords = Array.isArray(iiifRecordsCache) ? iiifRecordsCache : [];
  }

  /**
   * Build contextual MDX content from the content directory.
   * This includes collecting page metadata for sitemap and search index,
   * as well as building all MDX pages to HTML.
   */
  logLine("\n[3/6] Build contextual content from Markdown pages", "magenta", {
    bright: true,
  });
  // Collect pages metadata for sitemap injection
  pageRecords = await searchBuild.collectMdxPageRecords();
  // Build all MDX and assets
  logLine("\n• Building MDX pages...", "blue", { bright: true });
  await pages.buildContentTree(CONTENT_DIR, pageRecords);
  logLine("✓ MDX pages built\n", "green");

  /**
   * Build search index from IIIF and MDX records, then build or update
   * the search.html page and search runtime bundle.
   * This is done after all content is built so that the index is comprehensive.
   */
  logLine("\n[4/6] Create search indices", "magenta", { bright: true });
  try {
    const searchPath = path.join(OUT_DIR, "search.html");
    const needCreatePage = !fs.existsSync(searchPath);
    if (needCreatePage) {
      try {
        logLine("• Preparing search (initial)...", "blue", { bright: true });
      } catch (_) {}
      // Build result item template (if present) up-front so it can be inlined
      try {
        await search.ensureResultTemplate();
      } catch (_) {}
      try {
        logLine("  - Writing empty index...", "blue");
      } catch (_) {}
      await search.writeSearchIndex([]);
      try {
        logLine("  - Writing runtime...", "blue");
      } catch (_) {}
      const timeoutMs = Number(process.env.CANOPY_BUNDLE_TIMEOUT || 10000);
      let timedOut = false;
      await runtimes.prepareSearchRuntime(
        process.env.CANOPY_BUNDLE_TIMEOUT || 10000,
        "initial"
      );
      try {
        logLine("  - Building search.html...", "blue");
      } catch (_) {}
      await search.buildSearchPage();
      logLine("✓ Created search page", "cyan");
    }
    // Always (re)write the search index combining IIIF and MDX pages
    const combined = await buildSearchIndex(searchRecords, pageRecords);
    // Build facets for IIIF works based on configured metadata labels
    await generateFacets(combined);
    try {
      logLine("• Writing search runtime (final)...", "blue", { bright: true });
    } catch (_) {}
    await runtimes.prepareSearchRuntime(
      process.env.CANOPY_BUNDLE_TIMEOUT || 10000,
      "final"
    );
    // Rebuild result item template after content processing to capture latest
    try {
      await search.ensureResultTemplate();
    } catch (_) {}
    // Rebuild search.html to inline the latest result template
    try {
      logLine("• Updating search.html...", "blue");
    } catch (_) {}
    await search.buildSearchPage();
    try {
      logLine("✓ Search page updated", "cyan");
    } catch (_) {}
    // Itemize counts by type for a clearer summary
    const counts = new Map();
    for (const r of combined) {
      const t = String((r && r.type) || "page").toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const parts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t, n]) => `${t}: ${n}`);
    const breakdown = parts.length ? `: ${parts.join(", ")}` : "";
    logLine(
      `✓ Search index: ${combined.length} total records${breakdown}`,
      "cyan"
    );
  } catch (_) {}

  /**
   * Prepare client runtimes (e.g. search) by bundling with esbuild.
   * This is done early so that MDX content can reference runtime assets if needed.
   */
  logLine("\n[5/6] Prepare client runtimes and stylesheets", "magenta", {
    bright: true,
  });
  await runtimes.prepareAllRuntimes();
  ensureDirSync(path.join(OUT_DIR, "styles"));
  if (!process.env.CANOPY_SKIP_STYLES) {
    await ensureStyles();
    logLine("✓ Wrote styles.css\n", "cyan");
  }

  /**
   * Copy static assets from the assets directory to the output directory.
   */
  logLine("\n[6/6] Copy static assets", "magenta", { bright: true });
  await copyAssets();
}

module.exports = { build };

if (require.main === module) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
