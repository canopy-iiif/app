import React from "react";
import navigationHelpers from "../../../lib/components/navigation.js";

function normalizeManifestId(raw) {
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
