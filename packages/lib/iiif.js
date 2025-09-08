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
            // Bold success line for Collection fetches
            logLine(`✓ ${String(uri)} ➜ ${res.status}`, "yellow", {
              bright: true,
            });
          } else {
            const code = res ? res.status : "ERR";
            logLine(`✗ ${String(uri)} ➜ ${code}`, "red", { bright: true });
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
    const normId = normalizeIiifId(String(id || ''));
    const existingWithBase = byId.find(
      (e) => e && e.type === type && String(e.slug) === String(baseSlug)
    );
    if (existingWithBase && normalizeIiifId(existingWithBase.id) !== normId) {
      // Reassign the existing entry to the next available suffix to free the base
      const newSlug = computeUniqueSlug(index, baseSlug, existingWithBase.id, type);
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
        logLine(`IIIF: saved collection ➜ ${slug}.json`, "cyan", { dim: true });
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
  let CONFIG = {
    collection: {
      uri: "https://iiif.io/api/cookbook/recipe/0032-collection/collection.json",
    },
    iiif: { chunkSize: 10, concurrency: 6 },
    metadata: [],
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
          chunkSize:
            Number(di.chunkSize || CONFIG.iiif.chunkSize) ||
            CONFIG.iiif.chunkSize,
          concurrency:
            Number(di.concurrency || CONFIG.iiif.concurrency) ||
            CONFIG.iiif.concurrency,
          thumbnails: {
            unsafe: !!(di.thumbnails && di.thumbnails.unsafe === true),
            preferredSize:
              Number(di.thumbnails && di.thumbnails.preferredSize) || 1200,
          },
        },
        metadata: Array.isArray(d.metadata)
          ? d.metadata.map((s) => String(s)).filter(Boolean)
          : [],
      };
      const src = overrideConfigPath ? overrideConfigPath : "canopy.yml";
      logLine(`[canopy] Loaded config from ${src}...`, "white");
    } catch (e) {
      console.warn(
        "[canopy] Failed to read",
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
  ensureDirSync(IIIF_CACHE_COLLECTIONS_DIR);
  // Debug: list current collections cache contents
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
          `IIIF: cache/collections (start): ${files.length} file(s)` +
            (head ? ` [${head}${files.length > 8 ? ", …" : ""}]` : ""),
          "blue",
          { dim: true }
        );
      } catch (_) {}
    }
  } catch (_) {}
  const collectionUri =
    (CONFIG && CONFIG.collection && CONFIG.collection.uri) || null;
  try {
    try {
      if (collectionUri) {
        logLine(`${collectionUri}`, "white", {
          dim: true,
        });
      }
    } catch (_) {}
    console.log("");
  } catch (_) {}
  // Decide cache policy/log before any fetch
  let index = await loadManifestIndex();
  const prevUri = (index && index.collection && index.collection.uri) || "";
  const uriChanged = !!(collectionUri && prevUri && prevUri !== collectionUri);
  if (uriChanged) {
    try {
      const { logLine } = require("./log");
      logLine("IIIF Collection changed. Resetting cache.\n", "cyan");
    } catch (_) {}
    await flushManifestCache();
    index.byId = [];
  } else {
    try {
      const { logLine } = require("./log");
      logLine(
        "IIIF Collection unchanged. Preserving cache. Detecting cached resources...\n",
        "cyan"
      );
    } catch (_) {}
  }
  let collection = null;
  if (collectionUri) {
    // Try cached root collection first
    collection = await loadCachedCollectionById(collectionUri);
    if (collection) {
      try {
        const { logLine } = require("./log");
        logLine(`✓ ${String(collectionUri)} ➜ Cached`, "yellow");
      } catch (_) {}
    } else {
      collection = await readJsonFromUri(collectionUri, { log: true });
      if (collection) {
        try {
          await saveCachedCollection(
            collection,
            String(collection.id || collection["@id"] || collectionUri),
            ""
          );
        } catch (_) {}
      }
    }
  }
  if (!collection) {
    console.warn("IIIF: No collection available; skipping.");
    // Still write/update global index with configured URI, so other steps can rely on it
    try {
      const index = await loadManifestIndex();
      index.collection = {
        uri: String(collectionUri || ""),
        hash: "",
        updatedAt: new Date().toISOString(),
      };
      await saveManifestIndex(index);
    } catch (_) {}
    return { searchRecords: [] };
  }
  // Keep raw collection for traversal so structure remains available; normalize only for hash
  const collectionForHash = await normalizeToV3(collection);
  const currentSig = {
    uri: String(collectionUri || ""),
    hash: computeHash(collectionForHash),
  };
  index.collection = { ...currentSig, updatedAt: new Date().toISOString() };
  // Upsert root collection entry in index.byId
  try {
    const rootId = normalizeIiifId(
      String(collection.id || collection["@id"] || collectionUri || "")
    );
    const title = firstLabelString(collection && collection.label);
    const baseSlug = slugify(title || "collection", { lower: true, strict: true, trim: true }) || "collection";
    index.byId = Array.isArray(index.byId) ? index.byId : [];
    const slug = ensureBaseSlugFor(index, baseSlug, rootId, 'Collection');
    const existingIdx = index.byId.findIndex(
      (e) => e && normalizeIiifId(e.id) === rootId && e.type === "Collection"
    );
    const entry = { id: rootId, type: "Collection", slug, parent: "" };
    if (existingIdx >= 0) index.byId[existingIdx] = entry;
    else index.byId.push(entry);
    try { (RESERVED_SLUGS && RESERVED_SLUGS.Collection || new Set()).add(slug); } catch (_) {}
  } catch (_) {}
  await saveManifestIndex(index);

  const WorksLayout = await mdx.compileMdxToComponent(worksLayoutPath);
  // Recursively collect manifests across subcollections
  const tasks = [];
  async function loadOrFetchCollectionById(id, lns, fetchAllowed = true) {
    let c = await loadCachedCollectionById(String(id));
    if (c) {
      try {
        // Emit a standard Cached line so it mirrors network logs
        const { logLine } = require("./log");
        logLine(`✓ ${String(id)} ➜ Cached`, "yellow");
      } catch (_) {}
      if (lns) lns.push([`✓ ${String(id)} ➜ Cached`, "yellow"]);
      return c; // keep raw to preserve structure
    }
    if (!fetchAllowed) return null;
    const fetched = await readJsonFromUri(String(id), { log: true });
    try {
      await saveCachedCollection(
        fetched,
        String((fetched && (fetched.id || fetched["@id"])) || id),
        ""
      );
    } catch (_) {}
    return fetched;
  }
  async function collectTasksFromCollection(colObj, parentUri, visited) {
    if (!colObj) return;
    const colId = colObj.id || colObj["@id"] || parentUri || "";
    visited = visited || new Set();
    if (colId) {
      if (visited.has(colId)) return;
      visited.add(colId);
    }
    // Traverse explicit sub-collections under items only (no paging semantics)
    const items = Array.isArray(colObj && colObj.items) ? colObj.items : [];
    for (const it of items) {
      if (!it) continue;
      const t = String(it.type || it["@type"] || "");
      const id = it.id || it["@id"] || "";
      if (t.includes("Manifest")) {
        tasks.push({
          id: String(id),
          parent: String(colId || parentUri || ""),
        });
      } else if (t.includes("Collection")) {
        let subRaw = await loadOrFetchCollectionById(String(id));
        try {
          await saveCachedCollection(
            subRaw,
            String(subRaw.id || id),
            String(colId || parentUri || "")
          );
        } catch (_) {}
        try {
          const title = firstLabelString(subRaw && subRaw.label);
          const baseSlug = slugify(title || "collection", { lower: true, strict: true, trim: true }) || "collection";
          const idx = await loadManifestIndex();
          idx.byId = Array.isArray(idx.byId) ? idx.byId : [];
          const subIdNorm = normalizeIiifId(String(subRaw.id || id));
          const slug = computeUniqueSlug(idx, baseSlug, subIdNorm, 'Collection');
          const entry = {
            id: subIdNorm,
            type: "Collection",
            slug,
            parent: normalizeIiifId(String(colId || parentUri || "")),
          };
          const existing = idx.byId.findIndex(
            (e) =>
              e &&
              normalizeIiifId(e.id) === subIdNorm &&
              e.type === "Collection"
          );
          if (existing >= 0) idx.byId[existing] = entry;
          else idx.byId.push(entry);
          await saveManifestIndex(idx);
        } catch (_) {}
        await collectTasksFromCollection(subRaw, String(id), visited);
      } else if (/^https?:\/\//i.test(String(id || ""))) {
        let norm = await loadOrFetchCollectionById(String(id));
        const nt = String((norm && (norm.type || norm["@type"])) || "");
        if (nt.includes("Collection")) {
          try {
            const title = firstLabelString(norm && norm.label);
            const baseSlug = slugify(title || "collection", { lower: true, strict: true, trim: true }) || "collection";
            const idx = await loadManifestIndex();
            idx.byId = Array.isArray(idx.byId) ? idx.byId : [];
            const normId = normalizeIiifId(String(norm.id || id));
            const slug = computeUniqueSlug(idx, baseSlug, normId, 'Collection');
            const entry = {
              id: normId,
              type: "Collection",
              slug,
              parent: normalizeIiifId(String(colId || parentUri || "")),
            };
            const existing = idx.byId.findIndex(
              (e) => e && normalizeIiifId(e.id) === normId && e.type === "Collection"
            );
            if (existing >= 0) idx.byId[existing] = entry;
            else idx.byId.push(entry);
            await saveManifestIndex(idx);
          } catch (_) {}
          try {
            await saveCachedCollection(
              norm,
              String(norm.id || id),
              String(colId || parentUri || "")
            );
          } catch (_) {}
          await collectTasksFromCollection(norm, String(id), visited);
        } else if (nt.includes("Manifest")) {
          tasks.push({
            id: String(id),
            parent: String(colId || parentUri || ""),
          });
        }
      }
    }
  }
  await collectTasksFromCollection(
    collection,
    String(collection.id || collection["@id"] || collectionUri || ""),
    new Set()
  );
  const chunkSize = Math.max(
    1,
    Number(
      process.env.CANOPY_CHUNK_SIZE ||
        (CONFIG.iiif && CONFIG.iiif.chunkSize) ||
        10
    )
  );
  const chunks = Math.max(1, Math.ceil(tasks.length / chunkSize));
  try {
    logLine(
      `\nAggregating ${tasks.length} Manifest(s) in ${chunks} chunk(s)...`,
      "cyan"
    );
  } catch (_) {}
  const searchRecords = [];
  const unsafeThumbs = !!(
    CONFIG &&
    CONFIG.iiif &&
    CONFIG.iiif.thumbnails &&
    CONFIG.iiif.thumbnails.unsafe === true
  );
  const thumbSize =
    (CONFIG &&
      CONFIG.iiif &&
      CONFIG.iiif.thumbnails &&
      CONFIG.iiif.thumbnails.preferredSize) ||
    1200;
  for (let ci = 0; ci < chunks; ci++) {
    const chunk = tasks.slice(ci * chunkSize, (ci + 1) * chunkSize);
    try {
      logLine(`\nChunk (${ci + 1}/${chunks})\n`, "magenta");
    } catch (_) {}
    const concurrency = Math.max(
      1,
      Number(
        process.env.CANOPY_FETCH_CONCURRENCY ||
          (CONFIG.iiif && CONFIG.iiif.concurrency) ||
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
        // Buffer logs for ordered output
        const lns = [];
        // Logging: cached or fetched
        if (manifest) {
          lns.push([`✓ ${String(id)} ➜ Cached`, "yellow"]);
        } else if (/^https?:\/\//i.test(String(id || ""))) {
          try {
            const res = await fetch(String(id), {
              headers: { Accept: "application/json" },
            }).catch(() => null);
            if (res && res.ok) {
              lns.push([`✓ ${String(id)} ➜ ${res.status}`, "yellow"]);
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
                `✗ ${String(id)} ➜ ${res ? res.status : "ERR"}`,
                "red",
              ]);
              continue;
            }
          } catch (e) {
            lns.push([`✗ ${String(id)} ➜ ERR`, "red"]);
            continue;
          }
        } else if (/^file:\/\//i.test(String(id || ""))) {
          // Support local manifests via file:// in dev
          try {
            const local = await readJsonFromUri(String(id), { log: false });
            if (!local) {
              lns.push([`✗ ${String(id)} ➜ ERR`, "red"]);
              continue;
            }
            const norm = await normalizeToV3(local);
            manifest = norm;
            await saveCachedManifest(
              manifest,
              String(id),
              String(it.parent || "")
            );
            lns.push([`✓ ${String(id)} ➜ Cached`, "yellow"]);
          } catch (_) {
            lns.push([`✗ ${String(id)} ➜ ERR`, "red"]);
            continue;
          }
        } else {
          // Unsupported scheme; skip
          lns.push([`✗ ${String(id)} ➜ SKIP`, "red"]);
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
          try {
            components = await import("@canopy-iiif/ui");
          } catch (_) {
            components = {};
          }
          const { withBase } = require("./common");
          const Anchor = function A(props) {
            let { href = "", ...rest } = props || {};
            href = withBase(href);
            return React.createElement("a", { href, ...rest }, props.children);
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
          const { loadAppWrapper } = require("./mdx");
          const app = await loadAppWrapper();

          const mdxContent = React.createElement(WorksLayout, { manifest });
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
          const needsHydrate =
            body.includes("data-canopy-hydrate") ||
            body.includes("data-canopy-viewer");
          const jsRel = needsHydrate
            ? path
                .relative(
                  path.dirname(outPath),
                  path.join(OUT_DIR, "scripts", "canopy-viewer.js")
                )
                .split(path.sep)
                .join("/")
            : null;
          // Include hydration script via htmlShell
          let headExtra = head;
          // Ensure React globals are present for hydration if viewer present
          const needsReact =
            body.includes("data-react-root") ||
            body.includes("data-canopy-react") ||
            body.includes("data-canopy-viewer");
          if (needsReact) {
            try {
              const { ensureReactGlobals } = require("./mdx");
              await ensureReactGlobals();
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
              headExtra = `<script src="${vendorRel}"></script>` + headExtra;
            } catch (_) {}
          }
          let pageBody = body;
          let html = htmlShell({
            title,
            body: pageBody,
            cssHref: cssRel || "styles/styles.css",
            scriptHref: jsRel,
            headExtra,
          });
          try {
            html = require("./common").applyBaseToHtml(html);
          } catch (_) {}
          await fsp.writeFile(outPath, html, "utf8");
          lns.push([
            `✓ Created ${path.relative(process.cwd(), outPath)}`,
            "green",
          ]);
          // Resolve thumbnail URL for this manifest (safe by default; expanded "unsafe" if configured)
          let thumbUrl = "";
          try {
            const { getThumbnailUrl } = require("./thumbs");
            const url = await getThumbnailUrl(
              manifest,
              thumbSize,
              unsafeThumbs
            );
            if (url) {
              thumbUrl = String(url);
              const idx = await loadManifestIndex();
              if (Array.isArray(idx.byId)) {
                const entry = idx.byId.find(
                  (e) =>
                    e &&
                    e.id === String(manifest.id || id) &&
                    e.type === "Manifest"
                );
                if (entry) {
                  entry.thumbnail = String(url);
                  await saveManifestIndex(idx);
                }
              }
            }
          } catch (_) {}
          // Push search record including thumbnail (if available)
          searchRecords.push({
            id: String(manifest.id || id),
            title,
            href: href.split(path.sep).join("/"),
            type: "work",
            thumbnail: thumbUrl || undefined,
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
  return { searchRecords };
}

module.exports = {
  buildIiifCollectionPages,
  loadConfig,
  // Expose for other build steps that need to annotate cache metadata
  loadManifestIndex,
  saveManifestIndex,
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
