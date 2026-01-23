import React from "react";
import ReactDOMServer from "react-dom/server";
import MapPoint from "./MapPoint.jsx";
import navPlaceHelpers from "../../../../lib/components/nav-place.js";
import {
  useReferencedManifestMap,
  resolveReferencedManifests,
} from "../../utils/manifestReferences.js";

function normalizeNumber(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeCoordinates(props = {}) {
  const lat =
    normalizeNumber(props.lat) ??
    normalizeNumber(props.latitude) ??
    normalizeNumber(props.y);
  const lng =
    normalizeNumber(props.lng) ??
    normalizeNumber(props.lon) ??
    normalizeNumber(props.long) ??
    normalizeNumber(props.longitude) ??
    normalizeNumber(props.x);
  if (lat == null || lng == null) return null;
  return {lat, lng};
}

function renderDetailsHtml(children) {
  if (!children) return "";
  try {
    return ReactDOMServer.renderToStaticMarkup(
      React.createElement(React.Fragment, null, children)
    );
  } catch (_) {
    return "";
  }
}

function normalizeCustomPoint(child, index, manifestMap) {
  if (!React.isValidElement(child)) return null;
  if (child.type !== MapPoint && child.type?.displayName !== "MapPoint") return null;
  const coords = normalizeCoordinates(child.props || {});
  if (!coords) return null;
  const props = child.props || {};
  const id = props.id || `map-point-${index + 1}`;
  const title = props.title || props.label || `Point ${index + 1}`;
  const summary = props.summary || props.description || "";
  const href = props.href || props.link || "";
  let thumbnail = props.thumbnail || props.image || "";
  let thumbnailWidth = normalizeNumber(props.thumbnailWidth);
  let thumbnailHeight = normalizeNumber(props.thumbnailHeight);
  const detailsHtml = renderDetailsHtml(props.children);
  const manifestValues = Array.isArray(props.referencedManifests)
    ? props.referencedManifests
    : props.manifest
    ? [props.manifest]
    : Array.isArray(props.manifests)
    ? props.manifests
    : [];
  const manifests = resolveReferencedManifests(manifestValues, manifestMap);
  if (!thumbnail && manifests.length) {
    const manifestWithThumb = manifests.find(
      (manifest) => manifest && manifest.thumbnail
    );
    if (manifestWithThumb) {
      thumbnail = manifestWithThumb.thumbnail || "";
      if (
        thumbnail &&
        thumbnailWidth == null &&
        typeof manifestWithThumb.thumbnailWidth === "number"
      ) {
        thumbnailWidth = manifestWithThumb.thumbnailWidth;
      }
      if (
        thumbnail &&
        thumbnailHeight == null &&
        typeof manifestWithThumb.thumbnailHeight === "number"
      ) {
        thumbnailHeight = manifestWithThumb.thumbnailHeight;
      }
    }
  }
  return {
    id,
    title,
    summary,
    href,
    thumbnail,
    thumbnailWidth,
    thumbnailHeight,
    lat: coords.lat,
    lng: coords.lng,
    detailsHtml,
    manifests,
    type: "custom",
  };
}

function normalizeCustomPoints(children, manifestMap) {
  return React.Children.toArray(children)
    .map((child, index) => normalizeCustomPoint(child, index, manifestMap))
    .filter(Boolean);
}

function normalizeHeight(value) {
  if (value == null) return "600px";
  if (typeof value === "number") {
    return `${value}px`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "600px";
    if (/^[0-9.]+$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  }
  return "600px";
}

function normalizeTileLayer(entry, index) {
  if (!entry) return null;
  if (typeof entry === "string") {
    const url = entry.trim();
    if (!url) return null;
    return {
      name: `Layer ${index + 1}`,
      url,
      attribution: "",
    };
  }
  if (typeof entry === "object") {
    const url = entry.url || entry.href;
    if (!url) return null;
    const layer = {
      name: entry.name || entry.title || `Layer ${index + 1}`,
      url: String(url),
      attribution: entry.attribution || entry.credit || "",
    };
    const minZoom = normalizeNumber(entry.minZoom);
    const maxZoom = normalizeNumber(entry.maxZoom);
    if (Number.isFinite(minZoom)) layer.minZoom = minZoom;
    if (Number.isFinite(maxZoom)) layer.maxZoom = maxZoom;
    if (entry.subdomains) layer.subdomains = entry.subdomains;
    return layer;
  }
  return null;
}

function normalizeTileLayers(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((entry, index) => normalizeTileLayer(entry, index))
    .filter(Boolean);
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  return fallback;
}

function normalizeCenter(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const parts = value.split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const coords = normalizeCoordinates({lat: parts[0], lng: parts[1]});
      if (coords) return coords;
    }
    return null;
  }
  if (typeof value === "object") {
    const coords = normalizeCoordinates(value);
    if (coords) return coords;
  }
  return null;
}

function serializeProps(props, payload) {
  const clone = {};
  Object.keys(props || {}).forEach((key) => {
    if (key === "children") return;
    const value = props[key];
    if (typeof value === "function" || typeof value === "symbol") return;
    clone[key] = value;
  });
  return {...clone, ...payload};
}

function serializeForScript(data) {
  try {
    return JSON.stringify(data).replace(/</g, "\\u003c");
  } catch (_) {
    return "{}";
  }
}

function getDatasetInfo() {
  if (!navPlaceHelpers) {
    return {hasFeatures: false, version: null, href: "/api/navplace.json"};
  }
  try {
    return navPlaceHelpers.getNavPlaceDatasetInfo();
  } catch (_) {
    return {
      hasFeatures: false,
      version: null,
      href: navPlaceHelpers.NAVPLACE_PUBLIC_HREF || "/api/navplace.json",
    };
  }
}

export default function MdxMap({children, ...rest}) {
  const manifestMap = useReferencedManifestMap();
  const customPoints = normalizeCustomPoints(children, manifestMap);
  const datasetInfo = getDatasetInfo();
  const navDataset = {
    hasFeatures: Boolean(datasetInfo && datasetInfo.hasFeatures),
    href: (datasetInfo && datasetInfo.href) || "/api/navplace.json",
    version: datasetInfo && datasetInfo.version ? datasetInfo.version : null,
  };
  const height = normalizeHeight(rest.height);
  const tileLayers = normalizeTileLayers(rest.tileLayers || rest.tileLayer);
  const scrollWheelZoom = parseBoolean(rest.scrollWheelZoom, false);
  const cluster = parseBoolean(rest.cluster, true);
  const defaultCenter = normalizeCenter(rest.defaultCenter || rest.center);
  const defaultZoom = normalizeNumber(rest.defaultZoom || rest.zoom);
  const payload = serializeProps(rest, {
    className: rest.className || "",
    id: rest.id || null,
    height,
    tileLayers,
    scrollWheelZoom,
    cluster,
    customPoints,
    navDataset,
    defaultCenter,
    defaultZoom: Number.isFinite(defaultZoom) ? defaultZoom : null,
  });
  const json = serializeForScript(payload);
  const placeholderClass = ["canopy-map", rest.className]
    .filter(Boolean)
    .join(" ");
  const placeholderProps = {};
  if (placeholderClass) placeholderProps.className = placeholderClass;
  if (rest.id) placeholderProps.id = rest.id;
  if (rest.style) placeholderProps.style = rest.style;
  return (
    <div data-canopy-map="1">
      <div {...placeholderProps} aria-live="polite">
        <div className="canopy-map__status">Loading map…</div>
      </div>
      <script type="application/json" dangerouslySetInnerHTML={{__html: json}} />
    </div>
  );
}
