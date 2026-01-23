import React from "react";
import navigationHelpers from "../../../lib/components/navigation.js";
import referencedHelpers from "../../../lib/components/referenced.js";

const referencedModule =
  referencedHelpers && typeof referencedHelpers === "object"
    ? referencedHelpers
    : null;
const buildReferencedItems =
  referencedModule && typeof referencedModule.buildReferencedItems === "function"
    ? referencedModule.buildReferencedItems
    : null;
const normalizeReferencedManifestList =
  referencedModule &&
  typeof referencedModule.normalizeReferencedManifestList === "function"
    ? referencedModule.normalizeReferencedManifestList
    : null;

export function normalizeManifestId(raw) {
  if (!raw) return "";
  try {
    const url = new URL(String(raw));
    url.hash = "";
    const params = Array.from(url.searchParams.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])
    );
    url.search = "";
    params.forEach(([key, value]) => url.searchParams.append(key, value));
    return url.toString();
  } catch (_) {
    return String(raw || "").trim();
  }
}

const PageContextFallback = React.createContext(null);

export function useReferencedManifestMap() {
  const PageContext = navigationHelpers?.getPageContext?.() || PageContextFallback;
  const pageContext = React.useContext(PageContext);
  const referencedItems =
    pageContext && pageContext.page && Array.isArray(pageContext.page.referencedItems)
      ? pageContext.page.referencedItems
      : [];
  return React.useMemo(() => {
    const map = new Map();
    referencedItems.forEach((item) => {
      if (!item) return;
      const id = item.id || item.href;
      if (!id) return;
      const normalized = normalizeManifestId(id);
      if (normalized) map.set(normalized, item);
      map.set(String(id), item);
    });
    return map;
  }, [referencedItems]);
}

export function resolveManifestReferences(ids, manifestMap) {
  if (!Array.isArray(ids) || !ids.length || !manifestMap) return [];
  const seen = new Set();
  const out = [];
  ids.forEach((value) => {
    if (!value) return;
    const normalized = normalizeManifestId(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    const record = manifestMap.get(normalized) || manifestMap.get(String(value));
    if (!record) return;
    out.push({
      id: record.id || record.href || value,
      href: record.href || null,
      title: record.title || record.label || record.href || value,
      summary: record.summary || "",
      thumbnail: record.thumbnail || null,
      thumbnailWidth: record.thumbnailWidth,
      thumbnailHeight: record.thumbnailHeight,
      type: record.type || "work",
      metadata:
        Array.isArray(record.metadata) && record.metadata.length
          ? record.metadata
          : record.summary
          ? [record.summary]
          : [],
    });
  });
  return out;
}

export function resolveReferencedManifests(ids, manifestMap) {
  if (!Array.isArray(ids) || !ids.length) return [];
  const order = [];
  const seen = new Set();
  ids.forEach((value) => {
    const normalized = normalizeManifestId(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    order.push(normalized);
  });
  if (!order.length) return [];
  const manifestRecords = new Map();
  if (manifestMap) {
    const resolved = resolveManifestReferences(ids, manifestMap);
    resolved.forEach((entry) => {
      const key = normalizeManifestId(entry && (entry.id || entry.href));
      if (key && !manifestRecords.has(key)) {
        manifestRecords.set(key, entry);
      }
    });
  }
  const missing = order.filter((key) => key && !manifestRecords.has(key));
  if (missing.length && buildReferencedItems) {
    let fallbackItems = [];
    try {
      const normalizedMissing = normalizeReferencedManifestList
        ? normalizeReferencedManifestList(missing)
        : missing;
      if (normalizedMissing && normalizedMissing.length) {
        fallbackItems = buildReferencedItems(normalizedMissing) || [];
      }
    } catch (_) {
      fallbackItems = [];
    }
    fallbackItems.forEach((item) => {
      if (!item) return;
      const fallbackKey = normalizeManifestId(item.id || item.href);
      if (!fallbackKey || manifestRecords.has(fallbackKey)) return;
      manifestRecords.set(fallbackKey, {
        id: item.id || item.href || fallbackKey,
        href: item.href || null,
        title: item.title || item.href || "",
        summary: item.summary || "",
        thumbnail: item.thumbnail || null,
        thumbnailWidth: item.thumbnailWidth,
        thumbnailHeight: item.thumbnailHeight,
        type: item.type || "work",
        metadata:
          Array.isArray(item.metadata) && item.metadata.length
            ? item.metadata
            : item.summary
            ? [item.summary]
            : [],
      });
    });
  }
  return order
    .map((key) => manifestRecords.get(key))
    .filter(Boolean);
}
