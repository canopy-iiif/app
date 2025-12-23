import React from "react";
import slugify from "slugify";
import {
  Label as CloverLabel,
  Metadata as CloverMetadata,
  RequiredStatement as CloverRequiredStatement,
  Summary as CloverSummary,
} from "@samvera/clover-iiif/primitives";

function hasInternationalValue(value) {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((key) => {
    const entries = value[key];
    return (
      Array.isArray(entries) &&
      entries.some((entry) => String(entry || "").trim().length > 0)
    );
  });
}

function ensureMetadata(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const { label, value } = item;
    return hasInternationalValue(label) && hasInternationalValue(value);
  });
}

function getFirstIntlValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  try {
    const keys = Object.keys(value || {});
    for (const key of keys) {
      const arr = Array.isArray(value[key]) ? value[key] : [];
      for (const entry of arr) {
        if (entry == null) continue;
        const str = typeof entry === "string" ? entry : String(entry);
        if (str) return str;
      }
    }
  } catch (_) {}
  return "";
}

function normalizeMetadataLabelText(label) {
  if (!label) return "";
  return label.trim().replace(/[:\s]+$/g, "").toLowerCase();
}

function normalizeMetadataLabelValue(value) {
  const raw = getFirstIntlValue(value);
  if (!raw) return "";
  return normalizeMetadataLabelText(String(raw));
}

function buildFacetLabelMap(manifest) {
  const source =
    manifest && Array.isArray(manifest.__canopyMetadataFacets)
      ? manifest.__canopyMetadataFacets
      : null;
  if (!source || !source.length) return null;
  const map = new Map();
  for (const entry of source) {
    if (!entry || !entry.normalized) continue;
    map.set(entry.normalized, entry);
  }
  return map.size ? map : null;
}

const SLUG_OPTIONS = {lower: true, strict: true, trim: true};

function toValueSlug(value) {
  if (value == null) return "";
  try {
    const raw = typeof value === "string" ? value : String(value);
    return slugify(raw, SLUG_OPTIONS);
  } catch (_) {
    return "";
  }
}

function normalizeBasePath(value) {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  const cleaned = prefixed.replace(/\/+$/, "");
  return cleaned === "/" ? "" : cleaned;
}

let cachedBasePath = null;
function readBasePath() {
  if (cachedBasePath !== null) return cachedBasePath;
  const candidates = [];
  try {
    if (typeof window !== "undefined" && window.CANOPY_BASE_PATH != null) {
      candidates.push(window.CANOPY_BASE_PATH);
    }
  } catch (_) {}
  try {
    if (
      typeof globalThis !== "undefined" &&
      globalThis.CANOPY_BASE_PATH != null
    ) {
      candidates.push(globalThis.CANOPY_BASE_PATH);
    }
  } catch (_) {}
  try {
    if (typeof process !== "undefined" && process.env) {
      candidates.push(process.env.CANOPY_BASE_PATH);
    }
  } catch (_) {}
  for (const candidate of candidates) {
    const normalized = normalizeBasePath(candidate);
    if (normalized) {
      cachedBasePath = normalized;
      return cachedBasePath;
    }
  }
  cachedBasePath = "";
  return cachedBasePath;
}

function withBasePath(href) {
  try {
    const raw = typeof href === "string" ? href.trim() : "";
    if (!raw) return href;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return raw;
    if (!raw.startsWith("/")) return raw;
    const base = readBasePath();
    if (!base) return raw;
    if (raw === base || raw.startsWith(`${base}/`)) return raw;
    return `${base}${raw}`;
  } catch (_) {
    return href;
  }
}

function buildFacetSearchHref(labelSlug, valueSlug) {
  if (!labelSlug || !valueSlug) return "";
  try {
    const params = new URLSearchParams();
    params.set("type", "work");
    params.set(labelSlug, valueSlug);
    const path = `/search?${params.toString()}`;
    return withBasePath(path);
  } catch (_) {
    return "";
  }
}

function MetadataFacetLink(props) {
  const {value, facetSlug} = props;
  const text = value == null ? "" : String(value);
  if (!text) return null;
  const valueSlug = facetSlug ? toValueSlug(text) : "";
  const href = facetSlug && valueSlug ? buildFacetSearchHref(facetSlug, valueSlug) : "";
  if (!href) return text;
  return (
    <a
      href={href}
      data-canopy-facet-link=""
      data-facet-label={facetSlug}
      data-facet-value={valueSlug}
    >
      {text}
    </a>
  );
}

function buildFacetCustomValueContent(items, manifest) {
  if (!Array.isArray(items) || !items.length || !manifest) return [];
  const facetMap = buildFacetLabelMap(manifest);
  if (!facetMap) return [];
  const seen = new Set();
  const custom = [];
  for (const item of items) {
    if (!item || !item.label) continue;
    const normalized = normalizeMetadataLabelValue(item.label);
    if (!normalized || seen.has(normalized)) continue;
    if (!facetMap.has(normalized)) continue;
    const facet = facetMap.get(normalized);
    seen.add(normalized);
    custom.push({
      matchingLabel: item.label,
      Content: <MetadataFacetLink facetSlug={facet.slug} />,
    });
  }
  return custom;
}

function normalizeMatchingLabel(label) {
  if (!label) return "";
  return normalizeMetadataLabelValue(label);
}

function mergeCustomValueContent(userContent, autoContent) {
  const merged = [];
  const seen = new Set();
  const addEntry = (entry, track = false) => {
    if (!entry || !entry.matchingLabel || !entry.Content) return;
    merged.push(entry);
    if (!track) return;
    const normalized = normalizeMatchingLabel(entry.matchingLabel);
    if (normalized) seen.add(normalized);
  };
  const userList = Array.isArray(userContent) ? userContent : [];
  userList.forEach((entry) => addEntry(entry, true));
  const autoList = Array.isArray(autoContent) ? autoContent : [];
  autoList.forEach((entry) => {
    const normalized = normalizeMatchingLabel(entry.matchingLabel);
    if (normalized && seen.has(normalized)) return;
    addEntry(entry, false);
  });
  return merged.length ? merged : undefined;
}

export function Label({ manifest, label, ...rest }) {
  const intl = label || (manifest && manifest.label);
  if (!hasInternationalValue(intl)) return null;
  return <CloverLabel label={intl} {...rest} />;
}

export function Summary({ manifest, summary, ...rest }) {
  const intl = summary || (manifest && manifest.summary);
  if (!hasInternationalValue(intl)) return null;
  return <CloverSummary summary={intl} {...rest} />;
}

export function Metadata({ manifest, metadata, customValueContent, ...rest }) {
  const items = ensureMetadata(metadata || (manifest && manifest.metadata));
  if (!items.length) return null;
  const autoCustomContent = buildFacetCustomValueContent(items, manifest);
  const mergedCustomContent = mergeCustomValueContent(
    customValueContent,
    autoCustomContent
  );
  return (
    <CloverMetadata
      metadata={items}
      customValueContent={mergedCustomContent}
      {...rest}
    />
  );
}

export function RequiredStatement({ manifest, requiredStatement, ...rest }) {
  const stmt = requiredStatement || (manifest && manifest.requiredStatement);
  if (
    !stmt ||
    !hasInternationalValue(stmt.label) ||
    !hasInternationalValue(stmt.value)
  ) {
    return null;
  }
  return <CloverRequiredStatement requiredStatement={stmt} {...rest} />;
}

export const Primitives = {
  Label,
  Summary,
  Metadata,
  RequiredStatement,
};

export default Primitives;
