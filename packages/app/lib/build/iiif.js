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
} = require("../common");
const mdx = require("./mdx");
const { log, logLine, logResponse } = require("./log");

const IIIF_CACHE_DIR = path.resolve(".cache/iiif");
const IIIF_CACHE_MANIFESTS_DIR = path.join(IIIF_CACHE_DIR, "manifests");
const IIIF_CACHE_COLLECTIONS_DIR = path.join(IIIF_CACHE_DIR, "collections");
const IIIF_CACHE_COLLECTION = path.join(IIIF_CACHE_DIR, "collection.json");
// Primary global index location
const IIIF_CACHE_INDEX = path.join(IIIF_CACHE_DIR, "index.json");
// Legacy locations kept for backward compatibility (read + optional write)
const IIIF_CACHE_INDEX_LEGACY = path.join(
  IIIF_CACHE_DIR,
  "manifest-index.json"
);
const IIIF_CACHE_INDEX_MANIFESTS = path.join(
  IIIF_CACHE_MANIFESTS_DIR,
  "manifest-index.json"
);

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

function normalizeIiifId(raw) {
  try {
    const s = String(raw || "");
    if (!/^https?:\/\//i.test(s)) return s;
    const u = new URL(s);
    const entries = Array.from(u.searchParams.entries()).sort(
      (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])
    );
    u.search = "";
    for (const [k, v] of entries) u.searchParams.append(k, v);
    return u.toString();
  } catch (_) {
    return String(raw || "");
  }
}

async function readJsonFromUri(uri, options = { log: false }) {
  try {
    if (/^https?:\/\//i.test(uri)) {
      if (typeof fetch !== "function") return null;
      const res = await fetch(uri, {
        headers: { Accept: "application/json" },
      }).catch(() => null);
      if (options && options.log) {
        try {
          if (res && res.ok) {
            logLine(`↓ ${String(uri)} → ${res.status}`, "yellow", {
              bright: true,
            });
          } else {
            const code = res ? res.status : "ERR";
            logLine(`⊘ ${String(uri)} → ${code}`, "red", { bright: true });
          }
        } catch (_) {}
      }
      if (!res || !res.ok) return null;
      return await res.json();
    }
    const p = uri.startsWith("file://") ? new URL(uri) : { pathname: uri };
    const localPath = uri.startsWith("file://")
      ? p.pathname
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
      if (idx && typeof idx === "object") {
        const byId = Array.isArray(idx.byId)
          ? idx.byId
          : idx.byId && typeof idx.byId === "object"
          ? Object.keys(idx.byId).map((k) => ({
              id: k,
              type: "Manifest",
              slug: String(idx.byId[k] || ""),
              parent: (idx.parents && idx.parents[k]) || "",
            }))
          : [];
        return { byId, collection: idx.collection || null };
      }
    }
    // Fallback: legacy in .cache/iiif
    if (fs.existsSync(IIIF_CACHE_INDEX_LEGACY)) {
      const idx = await readJson(IIIF_CACHE_INDEX_LEGACY);
      if (idx && typeof idx === "object") {
        const byId = Array.isArray(idx.byId)
          ? idx.byId
          : idx.byId && typeof idx.byId === "object"
          ? Object.keys(idx.byId).map((k) => ({
              id: k,
              type: "Manifest",
              slug: String(idx.byId[k] || ""),
              parent: (idx.parents && idx.parents[k]) || "",
            }))
          : [];
        return { byId, collection: idx.collection || null };
      }
    }
    // Fallback: legacy in manifests subdir
    if (fs.existsSync(IIIF_CACHE_INDEX_MANIFESTS)) {
      const idx = await readJson(IIIF_CACHE_INDEX_MANIFESTS);
      if (idx && typeof idx === "object") {
        const byId = Array.isArray(idx.byId)
          ? idx.byId
          : idx.byId && typeof idx.byId === "object"
          ? Object.keys(idx.byId).map((k) => ({
              id: k,
              type: "Manifest",
              slug: String(idx.byId[k] || ""),
              parent: (idx.parents && idx.parents[k]) || "",
            }))
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
    const out = {
      byId: Array.isArray(index.byId) ? index.byId : [],
      collection: index.collection || null,
      // Optional build/search version; consumers may ignore
      version: index.version || undefined,
    };
    await fsp.writeFile(IIIF_CACHE_INDEX, JSON.stringify(out, null, 2), "utf8");
    // Remove legacy files to avoid confusion
    try {
      await fsp.rm(IIIF_CACHE_INDEX_LEGACY, { force: true });
    } catch (_) {}
    try {
      await fsp.rm(IIIF_CACHE_INDEX_MANIFESTS, { force: true });
    } catch (_) {}
  } catch (_) {}
}

// In-memory memo to avoid repeated FS scans when index mapping is missing
const MEMO_ID_TO_SLUG = new Map();
// Track slugs chosen during this run to avoid collisions when multiple
// collections/manifests share the same base title but mappings aren't yet saved.
const RESERVED_SLUGS = { Manifest: new Set(), Collection: new Set() };

function computeUniqueSlug(index, baseSlug, id, type) {
  const byId = Array.isArray(index && index.byId) ? index.byId : [];
  const normId = normalizeIiifId(String(id || ""));
  const used = new Set(
    byId
      .filter((e) => e && e.slug && e.type === type)
      .map((e) => String(e.slug))
  );
  const reserved = RESERVED_SLUGS[type] || new Set();
  let slug = baseSlug || (type === "Manifest" ? "untitled" : "collection");
  let i = 1;
  for (;;) {
    const existing = byId.find(
      (e) => e && e.type === type && String(e.slug) === String(slug)
    );
    if (existing) {
      // If this slug already maps to this id, reuse it and reserve.
      if (normalizeIiifId(existing.id) === normId) {
        reserved.add(slug);
        return slug;
      }
    }
    if (!used.has(slug) && !reserved.has(slug)) {
      reserved.add(slug);
      return slug;
    }
    slug = `${baseSlug}-${i++}`;
  }
}

function ensureBaseSlugFor(index, baseSlug, id, type) {
  try {
    const byId = Array.isArray(index && index.byId) ? index.byId : [];
    const normId = normalizeIiifId(String(id || ""));
    const existingWithBase = byId.find(
      (e) => e && e.type === type && String(e.slug) === String(baseSlug)
    );
    if (existingWithBase && normalizeIiifId(existingWithBase.id) !== normId) {
      // Reassign the existing entry to the next available suffix to free the base
      const newSlug = computeUniqueSlug(
        index,
        baseSlug,
        existingWithBase.id,
        type
      );
      if (newSlug && newSlug !== baseSlug) existingWithBase.slug = newSlug;
    }
  } catch (_) {}
  return baseSlug;
}

async function findSlugByIdFromDisk(id) {
  try {
    if (!fs.existsSync(IIIF_CACHE_MANIFESTS_DIR)) return null;
    const files = await fsp.readdir(IIIF_CACHE_MANIFESTS_DIR);
    for (const name of files) {
      if (!name || !name.toLowerCase().endsWith(".json")) continue;
      const p = path.join(IIIF_CACHE_MANIFESTS_DIR, name);
      try {
        const raw = await fsp.readFile(p, "utf8");
        const obj = JSON.parse(raw);
        const mid = normalizeIiifId(
          String((obj && (obj.id || obj["@id"])) || "")
        );
        if (mid && mid === normalizeIiifId(String(id))) {
          const slug = name.replace(/\.json$/i, "");
          return slug;
        }
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

async function loadCachedManifestById(id) {
  if (!id) return null;
  try {
    const index = await loadManifestIndex();
    let slug = null;
    if (Array.isArray(index.byId)) {
      const nid = normalizeIiifId(id);
      const entry = index.byId.find(
        (e) => e && normalizeIiifId(e.id) === nid && e.type === "Manifest"
      );
      slug = entry && entry.slug;
    }
    if (!slug) {
      // Try an on-disk scan to recover mapping if index is missing/out-of-sync
      const memo = MEMO_ID_TO_SLUG.get(String(id));
      if (memo) slug = memo;
      if (!slug) {
        const found = await findSlugByIdFromDisk(id);
        if (found) {
          slug = found;
          MEMO_ID_TO_SLUG.set(String(id), slug);
          try {
            // Heal index mapping for future runs
            index.byId = Array.isArray(index.byId) ? index.byId : [];
            const nid = normalizeIiifId(id);
            const existingEntryIdx = index.byId.findIndex(
              (e) => e && normalizeIiifId(e.id) === nid && e.type === "Manifest"
            );
            const entry = {
              id: String(nid),
              type: "Manifest",
              slug,
              parent: "",
            };
            if (existingEntryIdx >= 0) index.byId[existingEntryIdx] = entry;
            else index.byId.push(entry);
            await saveManifestIndex(index);
          } catch (_) {}
        }
      }
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
    const slug = computeUniqueSlug(index, baseSlug, id, "Manifest");
    ensureDirSync(IIIF_CACHE_MANIFESTS_DIR);
    const dest = path.join(IIIF_CACHE_MANIFESTS_DIR, slug + ".json");
    await fsp.writeFile(dest, JSON.stringify(manifest, null, 2), "utf8");
    index.byId = Array.isArray(index.byId) ? index.byId : [];
    const nid = normalizeIiifId(id);
    const existingEntryIdx = index.byId.findIndex(
      (e) => e && normalizeIiifId(e.id) === nid && e.type === "Manifest"
    );
    const entry = {
      id: String(nid),
      type: "Manifest",
      slug,
      parent: parentId ? String(parentId) : "",
    };
    if (existingEntryIdx >= 0) index.byId[existingEntryIdx] = entry;
    else index.byId.push(entry);
    await saveManifestIndex(index);
  } catch (_) {}
}

// Ensure any configured featured manifests are present in the local cache
// (and have thumbnails computed) so SSR components like <Hero /> can read them.
async function ensureFeaturedInCache(cfg) {
  try {
    const CONFIG = cfg || (await loadConfig());
    const featured = Array.isArray(CONFIG && CONFIG.featured) ? CONFIG.featured : [];
    if (!featured.length) return;
    const { getThumbnail } = require("../iiif/thumbnail");
    // Thumbnail sizing config
    const thumbSize = CONFIG && CONFIG.iiif && CONFIG.iiif.thumbnails && typeof CONFIG.iiif.thumbnails.preferredSize === 'number' ? CONFIG.iiif.thumbnails.preferredSize : 400;
    const unsafeThumbs = !!(CONFIG && CONFIG.iiif && CONFIG.iiif.thumbnails && (CONFIG.iiif.thumbnails.unsafe === true || CONFIG.iiif.thumbnails.unsafe === 'true'));
    for (const rawId of featured) {
      const id = normalizeIiifId(String(rawId || ''));
      if (!id) continue;
      let manifest = await loadCachedManifestById(id);
      if (!manifest) {
        const m = await readJsonFromUri(id).catch(() => null);
        if (!m) continue;
        const v3 = await normalizeToV3(m);
        if (!v3 || !v3.id) continue;
        await saveCachedManifest(v3, id, '');
        manifest = v3;
      }
      // Ensure thumbnail fields exist in index for this manifest (if computable)
      try {
        const t = await getThumbnail(manifest, thumbSize, unsafeThumbs);
        if (t && t.url) {
          const idx = await loadManifestIndex();
          if (Array.isArray(idx.byId)) {
            const entry = idx.byId.find((e) => e && e.type === 'Manifest' && normalizeIiifId(String(e.id)) === normalizeIiifId(String(manifest.id)));
            if (entry) {
              entry.thumbnail = String(t.url);
              if (typeof t.width === 'number') entry.thumbnailWidth = t.width;
              if (typeof t.height === 'number') entry.thumbnailHeight = t.height;
              await saveManifestIndex(idx);
            }
          }
        }
      } catch (_) {}
    }
  } catch (_) {
    // ignore failures; fallback SSR will still render a minimal hero without content
  }
}

async function flushManifestCache() {
  try {
    await fsp.rm(IIIF_CACHE_MANIFESTS_DIR, { recursive: true, force: true });
  } catch (_) {}
  ensureDirSync(IIIF_CACHE_MANIFESTS_DIR);
  ensureDirSync(IIIF_CACHE_COLLECTIONS_DIR);
  try {
    await fsp.rm(IIIF_CACHE_COLLECTIONS_DIR, { recursive: true, force: true });
  } catch (_) {}
  ensureDirSync(IIIF_CACHE_COLLECTIONS_DIR);
}

// Collections cache helpers
async function loadCachedCollectionById(id) {
  if (!id) return null;
  try {
    const index = await loadManifestIndex();
    let slug = null;
    if (Array.isArray(index.byId)) {
      const nid = normalizeIiifId(id);
      const entry = index.byId.find(
        (e) => e && normalizeIiifId(e.id) === nid && e.type === "Collection"
      );
      slug = entry && entry.slug;
    }
    if (!slug) {
      // Scan collections dir if mapping missing
      try {
        if (fs.existsSync(IIIF_CACHE_COLLECTIONS_DIR)) {
          const files = await fsp.readdir(IIIF_CACHE_COLLECTIONS_DIR);
          for (const name of files) {
            if (!name || !name.toLowerCase().endsWith(".json")) continue;
            const p = path.join(IIIF_CACHE_COLLECTIONS_DIR, name);
            try {
              const raw = await fsp.readFile(p, "utf8");
              const obj = JSON.parse(raw);
              const cid = normalizeIiifId(
                String((obj && (obj.id || obj["@id"])) || "")
              );
              if (cid && cid === normalizeIiifId(String(id))) {
                slug = name.replace(/\.json$/i, "");
                // heal mapping
                try {
                  index.byId = Array.isArray(index.byId) ? index.byId : [];
                  const nid = normalizeIiifId(id);
                  const existing = index.byId.findIndex(
                    (e) =>
                      e &&
                      normalizeIiifId(e.id) === nid &&
                      e.type === "Collection"
                  );
                  const entry = {
                    id: String(nid),
                    type: "Collection",
                    slug,
                    parent: "",
                  };
                  if (existing >= 0) index.byId[existing] = entry;
                  else index.byId.push(entry);
                  await saveManifestIndex(index);
                } catch (_) {}
                break;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
    if (!slug) return null;
    const p = path.join(IIIF_CACHE_COLLECTIONS_DIR, slug + ".json");
    if (!fs.existsSync(p)) return null;
    return await readJson(p);
  } catch (_) {
    return null;
  }
}

async function saveCachedCollection(collection, id, parentId) {
  try {
    ensureDirSync(IIIF_CACHE_COLLECTIONS_DIR);
    const index = await loadManifestIndex();
    const title = firstLabelString(collection && collection.label);
    const baseSlug =
      slugify(title || "collection", {
        lower: true,
        strict: true,
        trim: true,
      }) || "collection";
    const slug = computeUniqueSlug(index, baseSlug, id, "Collection");
    const dest = path.join(IIIF_CACHE_COLLECTIONS_DIR, slug + ".json");
    await fsp.writeFile(dest, JSON.stringify(collection, null, 2), "utf8");
    try {
      if (process.env.CANOPY_IIIF_DEBUG === "1") {
        const { logLine } = require("./log");
        logLine(`IIIF: saved collection → ${slug}.json`, "cyan", { dim: true });
      }
    } catch (_) {}
    index.byId = Array.isArray(index.byId) ? index.byId : [];
    const nid = normalizeIiifId(id);
    const existingEntryIdx = index.byId.findIndex(
      (e) => e && normalizeIiifId(e.id) === nid && e.type === "Collection"
    );
    const entry = {
      id: String(nid),
      type: "Collection",
      slug,
      parent: parentId ? String(parentId) : "",
    };
    if (existingEntryIdx >= 0) index.byId[existingEntryIdx] = entry;
    else index.byId.push(entry);
    await saveManifestIndex(index);
  } catch (_) {}
}

async function loadConfig() {
  const cfgPath = path.resolve("canopy.yml");
  if (!fs.existsSync(cfgPath)) return {};
  const raw = await fsp.readFile(cfgPath, "utf8");
  let cfg = {};
  try {
    cfg = yaml.load(raw) || {};
  } catch (_) {
    cfg = {};
  }
  return cfg || {};
}

// Traverse IIIF collection, cache manifests/collections, and render pages
async function buildIiifCollectionPages(CONFIG) {
  const cfg = CONFIG || (await loadConfig());
  const collectionUri =
    (cfg && cfg.collection && cfg.collection.uri) ||
    process.env.CANOPY_COLLECTION_URI ||
    "";
  if (!collectionUri) return { searchRecords: [] };

  // Fetch top-level collection
  logLine("• Traversing IIIF Collection(s)", "blue", { dim: true });
  const root = await readJsonFromUri(collectionUri, { log: true });
  if (!root) {
    logLine("IIIF: Failed to fetch collection", "red");
    return { searchRecords: [] };
  }
  const normalizedRoot = await normalizeToV3(root);
  // Save collection cache
  try {
    await saveCachedCollection(
      normalizedRoot,
      normalizedRoot.id || collectionUri,
      ""
    );
  } catch (_) {}

  // Recursively traverse Collections and gather all Manifest tasks
  const tasks = [];
  const visitedCollections = new Set(); // normalized ids
  const norm = (x) => {
    try {
      return normalizeIiifId(String(x || ""));
    } catch (_) {
      return String(x || "");
    }
  };
  async function gatherFromCollection(colLike, parentId) {
    try {
      // Resolve uri/id
      const uri =
        typeof colLike === "string"
          ? colLike
          : (colLike && (colLike.id || colLike["@id"])) || "";
      const col =
        typeof colLike === "object" && colLike && colLike.items
          ? colLike
          : await readJsonFromUri(uri, { log: true });
      if (!col) return;
      const ncol = await normalizeToV3(col);
      const colId = String((ncol && (ncol.id || uri)) || uri);
      const nid = norm(colId);
      if (visitedCollections.has(nid)) return; // avoid cycles
      visitedCollections.add(nid);
      try {
        await saveCachedCollection(ncol, colId, parentId || "");
      } catch (_) {}
      const itemsArr = Array.isArray(ncol.items) ? ncol.items : [];
      for (const entry of itemsArr) {
        if (!entry) continue;
        const t = String(entry.type || entry["@type"] || "").toLowerCase();
        const entryId = entry.id || entry["@id"] || "";
        if (t === "manifest") {
          tasks.push({ id: entryId, parent: colId });
        } else if (t === "collection") {
          await gatherFromCollection(entryId, colId);
        }
      }
      // Traverse strictly by parent/child hierarchy (Presentation 3): items → Manifest or Collection
    } catch (_) {}
  }
  await gatherFromCollection(normalizedRoot, "");
  if (!tasks.length) return { searchRecords: [] };

  // Split into chunks and process with limited concurrency
  const chunkSize = Math.max(
    1,
    Number(
      process.env.CANOPY_CHUNK_SIZE || (cfg.iiif && cfg.iiif.chunkSize) || 20
    )
  );
  const chunks = Math.ceil(tasks.length / chunkSize);
  // Summary before processing chunks
  try {
    const collectionsCount = visitedCollections.size || 0;
    logLine(
      `• Fetching ${tasks.length} Manifest(s) in ${chunks} chunk(s) across ${collectionsCount} Collection(s)`,
      "blue",
      { dim: true }
    );
  } catch (_) {}
  const iiifRecords = [];
  const unsafeThumbs = !!(
    cfg &&
    cfg.iiif &&
    cfg.iiif.thumbnails &&
    cfg.iiif.thumbnails.unsafe === true
  );
  const thumbSize =
    (cfg &&
      cfg.iiif &&
      cfg.iiif.thumbnails &&
      cfg.iiif.thumbnails.preferredSize) ||
    1200;

  // Compile the works layout component once per run
  let WorksLayoutComp = null;
  try {
    const worksLayoutPath = path.join(CONTENT_DIR, "works", "_layout.mdx");
    WorksLayoutComp = await mdx.compileMdxToComponent(worksLayoutPath);
  } catch (_) {
    // Minimal fallback layout if missing or fails to compile
    WorksLayoutComp = function FallbackWorksLayout({ manifest }) {
      const title = firstLabelString(manifest && manifest.label);
      return React.createElement(
        "div",
        { className: "content" },
        React.createElement("h1", null, title || "Untitled"),
        // Render viewer placeholder for hydration
        React.createElement(
          "div",
          { "data-canopy-viewer": "1" },
          React.createElement("script", {
            type: "application/json",
            dangerouslySetInnerHTML: {
              __html: JSON.stringify({
                iiifContent: manifest && (manifest.id || ""),
              }),
            },
          })
        )
      );
    };
  }

  for (let ci = 0; ci < chunks; ci++) {
    const chunk = tasks.slice(ci * chunkSize, (ci + 1) * chunkSize);
    logLine(`• Chunk ${ci + 1}/${chunks}`, "blue", { dim: true });

    const concurrency = Math.max(
      1,
      Number(
        process.env.CANOPY_FETCH_CONCURRENCY ||
          (cfg.iiif && cfg.iiif.concurrency) ||
          6
      )
    );
    let next = 0;
    const logs = new Array(chunk.length);
    let nextPrint = 0;
    function tryFlush() {
      try {
        while (nextPrint < logs.length && logs[nextPrint]) {
          const lines = logs[nextPrint];
          for (const [txt, color, opts] of lines) {
            try {
              logLine(txt, color, opts);
            } catch (_) {}
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
        const lns = [];
        if (manifest) {
          lns.push([`↓ ${String(id)} → Cached`, "yellow"]);
        } else if (/^https?:\/\//i.test(String(id || ""))) {
          try {
            const res = await fetch(String(id), {
              headers: { Accept: "application/json" },
            }).catch(() => null);
            if (res && res.ok) {
              lns.push([`↓ ${String(id)} → ${res.status}`, "yellow"]);
              const remote = await res.json();
              const norm = await normalizeToV3(remote);
              manifest = norm;
              await saveCachedManifest(
                manifest,
                String(id),
                String(it.parent || "")
              );
            } else {
              lns.push([
                `⊘ ${String(id)} → ${res ? res.status : "ERR"}`,
                "red",
              ]);
              continue;
            }
          } catch (e) {
            lns.push([`⊘ ${String(id)} → ERR`, "red"]);
            continue;
          }
        } else if (/^file:\/\//i.test(String(id || ""))) {
          try {
            const local = await readJsonFromUri(String(id), { log: false });
            if (!local) {
              lns.push([`⊘ ${String(id)} → ERR`, "red"]);
              continue;
            }
            const norm = await normalizeToV3(local);
            manifest = norm;
            await saveCachedManifest(
              manifest,
              String(id),
              String(it.parent || "")
            );
            lns.push([`↓ ${String(id)} → Cached`, "yellow"]);
          } catch (_) {
            lns.push([`⊘ ${String(id)} → ERR`, "red"]);
            continue;
          }
        } else {
          lns.push([`⊘ ${String(id)} → SKIP`, "red"]);
          continue;
        }
        if (!manifest) continue;
        manifest = await normalizeToV3(manifest);
        const title = firstLabelString(manifest.label);
        const baseSlug =
          slugify(title || "untitled", {
            lower: true,
            strict: true,
            trim: true,
          }) || "untitled";
        const nid = normalizeIiifId(String(manifest.id || id));
        let idxMap = await loadManifestIndex();
        idxMap.byId = Array.isArray(idxMap.byId) ? idxMap.byId : [];
        let mEntry = idxMap.byId.find(
          (e) => e && e.type === "Manifest" && normalizeIiifId(e.id) === nid
        );
        let slug = mEntry && mEntry.slug;
        if (!slug) {
          slug = computeUniqueSlug(idxMap, baseSlug, nid, "Manifest");
          const parentNorm = normalizeIiifId(String(it.parent || ""));
          const newEntry = {
            id: nid,
            type: "Manifest",
            slug,
            parent: parentNorm,
          };
          const existingIdx = idxMap.byId.findIndex(
            (e) => e && e.type === "Manifest" && normalizeIiifId(e.id) === nid
          );
          if (existingIdx >= 0) idxMap.byId[existingIdx] = newEntry;
          else idxMap.byId.push(newEntry);
          await saveManifestIndex(idxMap);
        }
        const href = path.join("works", slug + ".html");
        const outPath = path.join(OUT_DIR, href);
        ensureDirSync(path.dirname(outPath));
        try {
          let components = {};
          try {
            components = await import("@canopy-iiif/app/ui");
          } catch (_) {
            components = {};
          }
          const { withBase } = require("../common");
          const Anchor = function A(props) {
            let { href = "", ...rest } = props || {};
            href = withBase(href);
            return React.createElement("a", { href, ...rest }, props.children);
          };
          // Map exported UI components into MDX, with sensible aliases/fallbacks
          const compMap = { ...components, a: Anchor };
          if (!compMap.SearchPanel && compMap.CommandPalette) {
            compMap.SearchPanel = compMap.CommandPalette;
          }
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
          const { loadAppWrapper } = require("./mdx");
          const app = await loadAppWrapper();

          const mdxContent = React.createElement(WorksLayoutComp, { manifest });
          const siteTree = app && app.App ? mdxContent : mdxContent;
          const wrappedApp =
            app && app.App
              ? React.createElement(app.App, null, siteTree)
              : siteTree;
          const page = MDXProvider
            ? React.createElement(
                MDXProvider,
                { components: compMap },
                wrappedApp
              )
            : wrappedApp;
          const body = ReactDOMServer.renderToStaticMarkup(page);
          const head =
            app && app.Head
              ? ReactDOMServer.renderToStaticMarkup(
                  React.createElement(app.Head)
                )
              : "";
          const cssRel = path
            .relative(
              path.dirname(outPath),
              path.join(OUT_DIR, "styles", "styles.css")
            )
            .split(path.sep)
            .join("/");
          const needsHydrateViewer = body.includes("data-canopy-viewer");
          const needsRelated = body.includes("data-canopy-related-items");
          const needsHero = body.includes("data-canopy-hero");
          const needsCommand = body.includes("data-canopy-command");
          const needsHydrate =
            body.includes("data-canopy-hydrate") ||
            needsHydrateViewer ||
            needsRelated ||
            needsCommand;

          const viewerRel = needsHydrateViewer
            ? path
                .relative(
                  path.dirname(outPath),
                  path.join(OUT_DIR, "scripts", "canopy-viewer.js")
                )
                .split(path.sep)
                .join("/")
            : null;
          const sliderRel = needsRelated
            ? path
                .relative(
                  path.dirname(outPath),
                  path.join(OUT_DIR, "scripts", "canopy-slider.js")
                )
                .split(path.sep)
                .join("/")
            : null;
          const heroRel = needsHero
            ? path
                .relative(
                  path.dirname(outPath),
                  path.join(OUT_DIR, "scripts", "canopy-hero.js")
                )
                .split(path.sep)
                .join("/")
            : null;
          const relatedRel = needsRelated
            ? path
                .relative(
                  path.dirname(outPath),
                  path.join(OUT_DIR, "scripts", "canopy-related-items.js")
                )
                .split(path.sep)
                .join("/")
            : null;
          const commandRel = needsCommand
            ? path
                .relative(
                  path.dirname(outPath),
                  path.join(OUT_DIR, "scripts", "canopy-command.js")
                )
                .split(path.sep)
                .join("/")
            : null;

          let jsRel = null;
          if (needsHero && heroRel) jsRel = heroRel;
          else if (needsRelated && sliderRel) jsRel = sliderRel;
          else if (viewerRel) jsRel = viewerRel;

          let headExtra = head;
          const needsReact = !!(needsHydrateViewer || needsRelated || needsHero);
          let vendorTag = "";
          if (needsReact) {
            try {
              const vendorAbs = path.join(
                OUT_DIR,
                "scripts",
                "react-globals.js"
              );
              let vendorRel = path
                .relative(path.dirname(outPath), vendorAbs)
                .split(path.sep)
                .join("/");
              try {
                const stv = fs.statSync(vendorAbs);
                vendorRel += `?v=${Math.floor(stv.mtimeMs || Date.now())}`;
              } catch (_) {}
              vendorTag = `<script src="${vendorRel}"></script>`;
            } catch (_) {}
          }
          const extraScripts = [];
          if (heroRel && jsRel !== heroRel)
            extraScripts.push(`<script defer src="${heroRel}"></script>`);
          if (relatedRel && jsRel !== relatedRel)
            extraScripts.push(`<script defer src="${relatedRel}"></script>`);
          if (viewerRel && jsRel !== viewerRel)
            extraScripts.push(`<script defer src="${viewerRel}"></script>`);
          if (sliderRel && jsRel !== sliderRel)
            extraScripts.push(`<script defer src="${sliderRel}"></script>`);
          if (commandRel && jsRel !== commandRel)
            extraScripts.push(`<script defer src="${commandRel}"></script>`);
          if (extraScripts.length)
            headExtra = extraScripts.join("") + headExtra;
          try {
            const { BASE_PATH } = require("../common");
            if (BASE_PATH)
              vendorTag =
                `<script>window.CANOPY_BASE_PATH=${JSON.stringify(
                  BASE_PATH
                )}</script>` + vendorTag;
          } catch (_) {}
          let pageBody = body;
          let html = htmlShell({
            title,
            body: pageBody,
            cssHref: cssRel || "styles/styles.css",
            scriptHref: jsRel,
            headExtra: vendorTag + headExtra,
          });
          try {
            html = require("../common").applyBaseToHtml(html);
          } catch (_) {}
          await fsp.writeFile(outPath, html, "utf8");
          lns.push([
            `✔ Created ${path.relative(process.cwd(), outPath)}`,
            "green",
          ]);
          let thumbUrl = "";
          let thumbWidth = undefined;
          let thumbHeight = undefined;
          try {
            const { getThumbnail } = require("../iiif/thumbnail");
            const t = await getThumbnail(manifest, thumbSize, unsafeThumbs);
            if (t && t.url) {
              thumbUrl = String(t.url);
              thumbWidth = typeof t.width === "number" ? t.width : undefined;
              thumbHeight = typeof t.height === "number" ? t.height : undefined;
              const idx = await loadManifestIndex();
              if (Array.isArray(idx.byId)) {
                const entry = idx.byId.find(
                  (e) =>
                    e &&
                    e.id === String(manifest.id || id) &&
                    e.type === "Manifest"
                );
                if (entry) {
                  entry.thumbnail = String(thumbUrl);
                  if (typeof thumbWidth === "number")
                    entry.thumbnailWidth = thumbWidth;
                  if (typeof thumbHeight === "number")
                    entry.thumbnailHeight = thumbHeight;
                  await saveManifestIndex(idx);
                }
              }
            }
          } catch (_) {}
          iiifRecords.push({
            id: String(manifest.id || id),
            title,
            href: href.split(path.sep).join("/"),
            type: "work",
            thumbnail: thumbUrl || undefined,
            thumbnailWidth:
              typeof thumbWidth === "number" ? thumbWidth : undefined,
            thumbnailHeight:
              typeof thumbHeight === "number" ? thumbHeight : undefined,
          });
        } catch (e) {
          lns.push([
            `IIIF: failed to render for ${id || "<unknown>"} — ${e.message}`,
            "red",
          ]);
        }
        logs[idx] = lns;
        tryFlush();
      }
    }
    const workers = Array.from(
      { length: Math.min(concurrency, chunk.length) },
      () => worker()
    );
    await Promise.all(workers);
  }
  return { iiifRecords };
}

module.exports = {
  buildIiifCollectionPages,
  loadConfig,
  loadManifestIndex,
  saveManifestIndex,
  // Expose helpers used by build for cache warming
  loadCachedManifestById,
  saveCachedManifest,
  ensureFeaturedInCache,
};

// Debug: list collections cache after traversal
try {
  if (process.env.CANOPY_IIIF_DEBUG === "1") {
    const { logLine } = require("./log");
    try {
      const files = fs.existsSync(IIIF_CACHE_COLLECTIONS_DIR)
        ? fs
            .readdirSync(IIIF_CACHE_COLLECTIONS_DIR)
            .filter((n) => /\.json$/i.test(n))
        : [];
      const head = files.slice(0, 8).join(", ");
      logLine(
        `IIIF: cache/collections (end): ${files.length} file(s)` +
          (head ? ` [${head}${files.length > 8 ? ", …" : ""}]` : ""),
        "blue",
        { dim: true }
      );
    } catch (_) {}
  }
} catch (_) {}
