const React = require("react");
const ReactDOMServer = require("react-dom/server");
const crypto = require("crypto");
const slugify = require("slugify");
const yaml = require("js-yaml");
const {
  fs,
  fsp,
  path,
  OUT_DIR,
  CONTENT_DIR,
  ensureDirSync,
  htmlShell,
} = require("./common");
const mdx = require("./mdx");
const { log, logLine, logResponse } = require("./log");

const IIIF_CACHE_DIR = path.resolve(".cache/iiif");
const IIIF_CACHE_MANIFESTS_DIR = path.join(IIIF_CACHE_DIR, "manifests");
const IIIF_CACHE_COLLECTION = path.join(IIIF_CACHE_DIR, "collection.json");
// Primary global index location
const IIIF_CACHE_INDEX = path.join(IIIF_CACHE_DIR, "index.json");
// Legacy locations kept for backward compatibility (read + optional write)
const IIIF_CACHE_INDEX_LEGACY = path.join(IIIF_CACHE_DIR, "manifest-index.json");
const IIIF_CACHE_INDEX_MANIFESTS = path.join(IIIF_CACHE_MANIFESTS_DIR, "manifest-index.json");

function firstLabelString(label) {
  if (!label) return "Untitled";
  if (typeof label === "string") return label;
  const keys = Object.keys(label || {});
  if (!keys.length) return "Untitled";
  const arr = label[keys[0]];
  if (Array.isArray(arr) && arr.length) return String(arr[0]);
  return "Untitled";
}

async function normalizeToV3(resource) {
  try {
    const helpers = await import("@iiif/helpers");
    if (helpers && typeof helpers.toPresentation3 === "function") {
      return helpers.toPresentation3(resource);
    }
    if (helpers && typeof helpers.normalize === "function") {
      return helpers.normalize(resource);
    }
    if (helpers && typeof helpers.upgradeToV3 === "function") {
      return helpers.upgradeToV3(resource);
    }
  } catch (_) {}
  return resource;
}

async function readJson(p) {
  const raw = await fsp.readFile(p, "utf8");
  return JSON.parse(raw);
}

async function readJsonFromUri(uri) {
  try {
    if (/^https?:\/\//i.test(uri)) {
      if (typeof fetch !== "function") return null;
      const res = await fetch(uri, { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      return await res.json();
    }
    const p = uri.startsWith("file://") ? new URL(uri) : { pathname: uri };
    const localPath = uri.startsWith("file://")
      ? p
      : path.resolve(String(p.pathname));
    return await readJson(localPath);
  } catch (_) {
    return null;
  }
}

function computeHash(obj) {
  try {
    const json = JSON.stringify(deepSort(obj));
    return crypto.createHash("sha256").update(json).digest("hex");
  } catch (_) {
    return "";
  }
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort())
      out[key] = deepSort(value[key]);
    return out;
  }
  return value;
}

async function loadManifestIndex() {
  try {
    // Try primary path first
    if (fs.existsSync(IIIF_CACHE_INDEX)) {
      const idx = await readJson(IIIF_CACHE_INDEX);
      if (idx && typeof idx === 'object') {
        const byId = Array.isArray(idx.byId)
          ? idx.byId
          : (idx.byId && typeof idx.byId === 'object')
            ? Object.keys(idx.byId).map((k) => ({ id: k, type: 'Manifest', slug: String(idx.byId[k] || ''), parent: (idx.parents && idx.parents[k]) || '' }))
            : [];
        return { byId, collection: idx.collection || null };
      }
    }
    // Fallback: legacy in .cache/iiif
    if (fs.existsSync(IIIF_CACHE_INDEX_LEGACY)) {
      const idx = await readJson(IIIF_CACHE_INDEX_LEGACY);
      if (idx && typeof idx === 'object') {
        const byId = Array.isArray(idx.byId)
          ? idx.byId
          : (idx.byId && typeof idx.byId === 'object')
            ? Object.keys(idx.byId).map((k) => ({ id: k, type: 'Manifest', slug: String(idx.byId[k] || ''), parent: (idx.parents && idx.parents[k]) || '' }))
            : [];
        return { byId, collection: idx.collection || null };
      }
    }
    // Fallback: legacy in manifests subdir
    if (fs.existsSync(IIIF_CACHE_INDEX_MANIFESTS)) {
      const idx = await readJson(IIIF_CACHE_INDEX_MANIFESTS);
      if (idx && typeof idx === 'object') {
        const byId = Array.isArray(idx.byId)
          ? idx.byId
          : (idx.byId && typeof idx.byId === 'object')
            ? Object.keys(idx.byId).map((k) => ({ id: k, type: 'Manifest', slug: String(idx.byId[k] || ''), parent: (idx.parents && idx.parents[k]) || '' }))
            : [];
        return { byId, collection: idx.collection || null };
      }
    }
  } catch (_) {}
  return { byId: [], collection: null };
}

async function saveManifestIndex(index) {
  try {
    ensureDirSync(IIIF_CACHE_DIR);
    const out = { byId: Array.isArray(index.byId) ? index.byId : [], collection: index.collection || null };
    await fsp.writeFile(IIIF_CACHE_INDEX, JSON.stringify(out, null, 2), 'utf8');
    // Remove legacy files to avoid confusion
    try { await fsp.rm(IIIF_CACHE_INDEX_LEGACY, { force: true }); } catch (_) {}
    try { await fsp.rm(IIIF_CACHE_INDEX_MANIFESTS, { force: true }); } catch (_) {}
  } catch (_) {}
}

async function loadCachedManifestById(id) {
  if (!id) return null;
  try {
    const index = await loadManifestIndex();
    let slug = null;
    if (Array.isArray(index.byId)) {
      const entry = index.byId.find((e) => e && e.id === id && e.type === 'Manifest');
      slug = entry && entry.slug;
    }
    if (!slug) return null;
    const p = path.join(IIIF_CACHE_MANIFESTS_DIR, slug + ".json");
    if (!fs.existsSync(p)) return null;
    return await readJson(p);
  } catch (_) {
    return null;
  }
}

async function saveCachedManifest(manifest, id, parentId) {
  try {
    const index = await loadManifestIndex();
    const title = firstLabelString(manifest && manifest.label);
    const baseSlug =
      slugify(title || "untitled", { lower: true, strict: true, trim: true }) ||
      "untitled";
    const usedSlugs = new Set(
      (Array.isArray(index.byId) ? index.byId : []).map((e) => e && e.slug).filter(Boolean)
    );
    let slug = baseSlug;
    let i = 1;
    while (usedSlugs.has(slug)) {
      const existing = (index.byId || []).find((e) => e && e.slug === slug);
      if (existing && existing.id === id) break;
      slug = `${baseSlug}-${i++}`;
    }
    ensureDirSync(IIIF_CACHE_MANIFESTS_DIR);
    const dest = path.join(IIIF_CACHE_MANIFESTS_DIR, slug + ".json");
    await fsp.writeFile(dest, JSON.stringify(manifest, null, 2), "utf8");
    index.byId = Array.isArray(index.byId) ? index.byId : [];
    const existingEntryIdx = index.byId.findIndex((e) => e && e.id === id && e.type === 'Manifest');
    const entry = { id: String(id), type: 'Manifest', slug, parent: parentId ? String(parentId) : '' };
    if (existingEntryIdx >= 0) index.byId[existingEntryIdx] = entry; else index.byId.push(entry);
    await saveManifestIndex(index);
  } catch (_) {}
}

async function flushManifestCache() {
  try {
    await fsp.rm(IIIF_CACHE_MANIFESTS_DIR, { recursive: true, force: true });
  } catch (_) {}
  ensureDirSync(IIIF_CACHE_MANIFESTS_DIR);
}

async function loadConfig() {
  let CONFIG = {
    collection: {
      uri: "https://iiif.io/api/cookbook/recipe/0032-collection/collection.json",
    },
    iiif: { chunkSize: 10, concurrency: 6 },
  };
  const overrideConfigPath = process.env.CANOPY_CONFIG;
  const configPath = path.resolve(overrideConfigPath || "canopy.yml");
  if (fs.existsSync(configPath)) {
    try {
      const raw = await fsp.readFile(configPath, "utf8");
      const data = yaml.load(raw) || {};
      const d = data || {};
      const di = d.iiif || {};
      CONFIG = {
        collection: {
          uri: (d.collection && d.collection.uri) || CONFIG.collection.uri,
        },
        iiif: {
          chunkSize: Number(di.chunkSize || CONFIG.iiif.chunkSize) || CONFIG.iiif.chunkSize,
          concurrency: Number(di.concurrency || CONFIG.iiif.concurrency) || CONFIG.iiif.concurrency,
          thumbnails: {
            unsafe: !!(di.thumbnails && di.thumbnails.unsafe === true),
            preferredSize: Number(di.thumbnails && di.thumbnails.preferredSize) || 1200,
          }
        }
      };
      console.log(
        "Loaded config from",
        overrideConfigPath ? overrideConfigPath : "canopy.yml"
      );
    } catch (e) {
      console.warn(
        "Failed to read",
        overrideConfigPath ? overrideConfigPath : "canopy.yml",
        e.message
      );
    }
  }
  if (process.env.CANOPY_COLLECTION_URI) {
    CONFIG.collection.uri = String(process.env.CANOPY_COLLECTION_URI);
    console.log("Using collection URI from CANOPY_COLLECTION_URI");
  }
  return CONFIG;
}

async function buildIiifCollectionPages(CONFIG) {
  const worksDir = path.join(CONTENT_DIR, "works");
  const worksLayoutPath = path.join(worksDir, "_layout.mdx");
  if (!fs.existsSync(worksLayoutPath)) {
    console.log(
      "IIIF: No content/works/_layout.mdx found; skipping IIIF page build."
    );
    return { searchRecords: [] };
  }
  ensureDirSync(IIIF_CACHE_MANIFESTS_DIR);
  const collectionUri =
    (CONFIG && CONFIG.collection && CONFIG.collection.uri) || null;
  let collection = null;
  if (collectionUri) collection = await readJsonFromUri(collectionUri);
  if (!collection) {
    console.warn("IIIF: No collection available; skipping.");
    // Still write/update global index with configured URI, so other steps can rely on it
    try {
      const index = await loadManifestIndex();
      index.collection = { uri: String(collectionUri || ''), hash: '', updatedAt: new Date().toISOString() };
      await saveManifestIndex(index);
    } catch (_) {}
    return { searchRecords: [] };
  }
  try {
    logLine("\n-- Building Canopy from IIIF Collection...\n", "cyan");
    logLine(String(collectionUri) + "\n", "white");
    logLine("Creating Manifest listing...\n", "cyan");
  } catch (_) {}
  collection = await normalizeToV3(collection);
  const index = await loadManifestIndex();
  const currentSig = {
    uri: String(collectionUri || ""),
    hash: computeHash(collection),
  };
  const prev = (index && index.collection) || null;
  const changed = !prev || prev.uri !== currentSig.uri;
  if (changed) {
    try {
      require("./log").log(
        "IIIF: collection changed, flushing cache.\n",
        "magenta",
        { dim: true }
      );
    } catch (_) {}
    await flushManifestCache();
    index.byId = [];
  }
  index.collection = { ...currentSig, updatedAt: new Date().toISOString() };
  // Upsert root collection entry in index.byId
  try {
    const rootId = String(collection.id || collection['@id'] || collectionUri || '');
    const title = firstLabelString(collection && collection.label);
    const slug = slugify(title || 'collection', { lower: true, strict: true, trim: true }) || 'collection';
    index.byId = Array.isArray(index.byId) ? index.byId : [];
    const existingIdx = index.byId.findIndex((e) => e && e.id === rootId && e.type === 'Collection');
    const entry = { id: rootId, type: 'Collection', slug, parent: '' };
    if (existingIdx >= 0) index.byId[existingIdx] = entry; else index.byId.push(entry);
  } catch (_) {}
  await saveManifestIndex(index);

  const WorksLayout = await mdx.compileMdxToComponent(worksLayoutPath);
  // Recursively collect manifests across subcollections
  const tasks = [];
  async function collectTasksFromCollection(colObj, parentUri, visited) {
    if (!colObj) return;
    const colId = colObj.id || colObj['@id'] || parentUri || '';
    visited = visited || new Set();
    if (colId) {
      if (visited.has(colId)) return;
      visited.add(colId);
    }
    const items = Array.isArray(colObj.items) ? colObj.items : [];
    for (const it of items) {
      if (!it) continue;
      const t = String(it.type || it['@type'] || '');
      const id = it.id || it['@id'] || '';
      if (t.includes('Manifest')) {
        tasks.push({ id: String(id), parent: String(colId || parentUri || '') });
      } else if (t.includes('Collection')) {
        const sub = await readJsonFromUri(String(id));
        const subNorm = await normalizeToV3(sub);
        try {
          const title = firstLabelString(subNorm && subNorm.label);
          const slug = slugify(title || 'collection', { lower: true, strict: true, trim: true }) || 'collection';
          const idx = await loadManifestIndex();
          idx.byId = Array.isArray(idx.byId) ? idx.byId : [];
          const entry = { id: String(subNorm.id || id), type: 'Collection', slug, parent: String(colId || parentUri || '') };
          const existing = idx.byId.findIndex((e) => e && e.id === entry.id && e.type === 'Collection');
          if (existing >= 0) idx.byId[existing] = entry; else idx.byId.push(entry);
          await saveManifestIndex(idx);
        } catch (_) {}
        await collectTasksFromCollection(subNorm, String(id), visited);
      } else if (/^https?:\/\//i.test(String(id || ''))) {
        const fetched = await readJsonFromUri(String(id));
        const norm = await normalizeToV3(fetched);
        const nt = String((norm && (norm.type || norm['@type'])) || '');
        if (nt.includes('Collection')) {
          try {
            const title = firstLabelString(norm && norm.label);
            const slug = slugify(title || 'collection', { lower: true, strict: true, trim: true }) || 'collection';
            const idx = await loadManifestIndex();
            idx.byId = Array.isArray(idx.byId) ? idx.byId : [];
            const entry = { id: String(norm.id || id), type: 'Collection', slug, parent: String(colId || parentUri || '') };
            const existing = idx.byId.findIndex((e) => e && e.id === entry.id && e.type === 'Collection');
            if (existing >= 0) idx.byId[existing] = entry; else idx.byId.push(entry);
            await saveManifestIndex(idx);
          } catch (_) {}
          await collectTasksFromCollection(norm, String(id), visited);
        } else if (nt.includes('Manifest')) {
          tasks.push({ id: String(id), parent: String(colId || parentUri || '') });
        }
      }
    }
  }
  await collectTasksFromCollection(collection, String(collection.id || collection['@id'] || collectionUri || ''), new Set());
  const chunkSize = Math.max(1, Number(process.env.CANOPY_CHUNK_SIZE || (CONFIG.iiif && CONFIG.iiif.chunkSize) || 10));
  const chunks = Math.max(1, Math.ceil(tasks.length / chunkSize));
  try { logLine(`Aggregating ${tasks.length} Manifest(s) in ${chunks} chunk(s)...\n`, 'cyan'); } catch (_) {}
  const searchRecords = [];
  const unsafeThumbs = !!(CONFIG && CONFIG.iiif && CONFIG.iiif.thumbnails && CONFIG.iiif.thumbnails.unsafe === true);
  const thumbSize = (CONFIG && CONFIG.iiif && CONFIG.iiif.thumbnails && CONFIG.iiif.thumbnails.preferredSize) || 1200;
  for (let ci = 0; ci < chunks; ci++) {
    const chunk = tasks.slice(ci * chunkSize, (ci + 1) * chunkSize);
    try {
      logLine(`\nChunk (${ci + 1}/${chunks})\n`, "magenta");
    } catch (_) {}
    const concurrency = Math.max(1, Number(process.env.CANOPY_FETCH_CONCURRENCY || (CONFIG.iiif && CONFIG.iiif.concurrency) || 6));
    let next = 0;
    const logs = new Array(chunk.length);
    let nextPrint = 0;
    function tryFlush() {
      try {
        while (nextPrint < logs.length && logs[nextPrint]) {
          const lines = logs[nextPrint];
          for (const [txt, color, opts] of lines) {
            try { logLine(txt, color, opts); } catch (_) {}
          }
          logs[nextPrint] = null;
          nextPrint++;
        }
      } catch (_) {}
    }
    async function worker() {
      for (;;) {
        const it = chunk[next++];
        if (!it) break;
        const idx = next - 1;
        const id = it.id || it["@id"] || "";
        let manifest = await loadCachedManifestById(id);
        // Buffer logs for ordered output
        const lns = [];
        // Logging: cached or fetched
        if (manifest) {
          lns.push([`✓ ${String(id)} ➜ Cached`, 'yellow']);
        } else if (/^https?:\/\//i.test(String(id || ""))) {
          try {
            const res = await fetch(String(id), {
              headers: { Accept: "application/json" },
            }).catch(() => null);
            if (res && res.ok) {
              lns.push([`✓ ${String(id)} ➜ ${res.status}`, 'yellow']);
              const remote = await res.json();
              const norm = await normalizeToV3(remote);
              manifest = norm;
              await saveCachedManifest(manifest, String(id), String(it.parent || ''));
            } else {
              lns.push([`✗ ${String(id)} ➜ ${res ? res.status : 'ERR'}`, 'red']);
              continue;
            }
          } catch (e) {
            lns.push([`✗ ${String(id)} ➜ ERR`, 'red']);
            continue;
          }
        } else {
          // Non-http id; skip with error log
          lns.push([`✗ ${String(id)} ➜ SKIP`, 'red']);
          continue;
        }
        if (!manifest) continue;
        manifest = await normalizeToV3(manifest);
        const title = firstLabelString(manifest.label);
        const slug = slugify(title || "untitled", {
          lower: true,
          strict: true,
          trim: true,
        });
        const href = path.join("works", slug + ".html");
        const outPath = path.join(OUT_DIR, href);
        ensureDirSync(path.dirname(outPath));
        try {
          // Provide MDX components mapping so tags like <Viewer/> and <HelloWorld/> resolve
          let components = {};
          try { components = await import('@canopy-iiif/ui'); } catch (_) { components = {}; }
          const { withBase } = require('./common');
          const Anchor = function A(props) {
            let { href = '', ...rest } = props || {};
            href = withBase(href);
            return React.createElement('a', { href, ...rest }, props.children);
          };
          const compMap = { ...components, a: Anchor };
          // Gracefully handle HelloWorld if not provided anywhere
          if (!components.HelloWorld) {
            components.HelloWorld = components.Fallback
              ? (props) =>
                  React.createElement(components.Fallback, {
                    name: "HelloWorld",
                    ...props,
                  })
              : () => null;
          }
          let MDXProvider = null;
          try {
            const mod = await import("@mdx-js/react");
            MDXProvider = mod.MDXProvider || mod.default || null;
          } catch (_) {
            MDXProvider = null;
          }
          const { loadAppWrapper } = require('./mdx');
          const app = await loadAppWrapper();

          const mdxContent = React.createElement(WorksLayout, { manifest });
          const siteTree = app && app.App ? mdxContent : mdxContent;
          const wrappedApp = app && app.App ? React.createElement(app.App, null, siteTree) : siteTree;
          const page = MDXProvider
            ? React.createElement(MDXProvider, { components: compMap }, wrappedApp)
            : wrappedApp;
          const body = ReactDOMServer.renderToStaticMarkup(page);
          const head = app && app.Head ? ReactDOMServer.renderToStaticMarkup(React.createElement(app.Head)) : '';
          const cssRel = path
            .relative(path.dirname(outPath), path.join(OUT_DIR, "styles.css"))
            .split(path.sep)
            .join("/");
          const needsHydrate =
            body.includes("data-canopy-hydrate") ||
            body.includes("data-canopy-viewer");
          const jsRel = needsHydrate
            ? path
                .relative(
                  path.dirname(outPath),
                  path.join(OUT_DIR, "canopy-viewer.js")
                )
                .split(path.sep)
                .join("/")
            : null;
          // Include hydration script via htmlShell
          let headExtra = head;
          // Ensure React globals are present for hydration if viewer present
          const needsReact =
            body.includes('data-react-root') ||
            body.includes('data-canopy-react') ||
            body.includes('data-canopy-viewer');
          if (needsReact) {
            try {
              const { ensureReactGlobals } = require('./mdx');
              await ensureReactGlobals();
              const vendorAbs = path.join(OUT_DIR, 'scripts', 'react-globals.js');
              let vendorRel = path.relative(path.dirname(outPath), vendorAbs).split(path.sep).join('/');
              try { const stv = fs.statSync(vendorAbs); vendorRel += `?v=${Math.floor(stv.mtimeMs || Date.now())}`; } catch (_) {}
              headExtra = `<script src="${vendorRel}"></script>` + headExtra;
            } catch (_) {}
          }
          let pageBody = body;
          let html = htmlShell({
            title,
            body: pageBody,
            cssHref: cssRel || "styles.css",
            scriptHref: jsRel,
            headExtra,
          });
          try { html = require('./common').applyBaseToHtml(html); } catch (_) {}
          await fsp.writeFile(outPath, html, "utf8");
          lns.push([`✓ Created ${path.relative(process.cwd(), outPath)}`, 'green']);
          // Resolve thumbnail URL for this manifest (safe by default; expanded "unsafe" if configured)
          let thumbUrl = '';
          try {
            const { getThumbnailUrl } = require('./thumbs');
            const url = await getThumbnailUrl(manifest, thumbSize, unsafeThumbs);
            if (url) {
              thumbUrl = String(url);
              const idx = await loadManifestIndex();
              if (Array.isArray(idx.byId)) {
                const entry = idx.byId.find((e) => e && e.id === String(manifest.id || id) && e.type === 'Manifest');
                if (entry) { entry.thumbnail = String(url); await saveManifestIndex(idx); }
              }
            }
          } catch (_) {}
          // Push search record including thumbnail (if available)
          searchRecords.push({
            id: String(manifest.id || id),
            title,
            href: href.split(path.sep).join("/"),
            type: 'work',
            thumbnail: thumbUrl || undefined,
          });
        } catch (e) {
          lns.push([`IIIF: failed to render for ${id || '<unknown>'} — ${e.message}`, 'red']);
        }
        logs[idx] = lns;
        tryFlush();
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, chunk.length) }, () => worker());
    await Promise.all(workers);
  }
  return { searchRecords };
}

module.exports = {
  buildIiifCollectionPages,
  loadConfig,
};
