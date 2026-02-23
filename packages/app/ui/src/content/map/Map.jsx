import React from "react";
import {createRoot} from "react-dom/client";
import ReferencedManifestCard from "../../layout/ReferencedManifestCard.jsx";

const DEFAULT_TILE_LAYERS = [
  {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
];

const CUSTOM_MARKER_SIZE = 40;
const CUSTOM_MARKER_RADIUS = CUSTOM_MARKER_SIZE / 2;
// Keep popup stems hovering just above the 40px markers.
const CUSTOM_MARKER_POPUP_OFFSET = -CUSTOM_MARKER_RADIUS + 6;
const DEFAULT_ACCENT_HEX = "#2563eb";

function resolveGlobalLeaflet() {
  try {
    if (typeof globalThis !== "undefined" && globalThis.L) return globalThis.L;
  } catch (_) {}
  try {
    if (typeof window !== "undefined" && window.L) return window.L;
  } catch (_) {}
  return null;
}

function waitForLeaflet(timeoutMs = 5000) {
  const existing = resolveGlobalLeaflet();
  if (existing) return Promise.resolve(existing);
  let timer = null;
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const onReady = () => {
      const resolved = resolveGlobalLeaflet();
      if (resolved) {
        cleanup();
        resolve(resolved);
      }
    };
    const poll = () => {
      const resolved = resolveGlobalLeaflet();
      if (resolved) {
        cleanup();
        resolve(resolved);
        return;
      }
      if (Date.now() > deadline) {
        cleanup();
        reject(new Error("Leaflet runtime not available"));
        return;
      }
      timer = setTimeout(poll, 50);
    };
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("canopy:leaflet-ready", onReady);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("canopy:leaflet-ready", onReady);
    }
    poll();
  });
}

function readBasePath() {
  const normalize = (val) => {
    if (!val) return "";
    const raw = String(val).trim();
    if (!raw) return "";
    const withLead = raw.startsWith("/") ? raw : `/${raw}`;
    return withLead.replace(/\/+$/, "");
  };
  try {
    if (typeof window !== "undefined" && window.CANOPY_BASE_PATH != null) {
      const fromWindow = normalize(window.CANOPY_BASE_PATH);
      if (fromWindow) return fromWindow;
    }
  } catch (_) {}
  try {
    if (typeof globalThis !== "undefined" && globalThis.CANOPY_BASE_PATH != null) {
      const fromGlobal = normalize(globalThis.CANOPY_BASE_PATH);
      if (fromGlobal) return fromGlobal;
    }
  } catch (_) {}
  try {
    if (typeof process !== "undefined" && process.env && process.env.CANOPY_BASE_PATH) {
      const fromEnv = normalize(process.env.CANOPY_BASE_PATH);
      if (fromEnv) return fromEnv;
    }
  } catch (_) {}
  return "";
}

function withBasePath(href) {
  try {
    const raw = typeof href === "string" ? href.trim() : "";
    if (!raw) return raw;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return raw;
    if (!raw.startsWith("/")) return raw;
    const base = readBasePath();
    if (!base || base === "/") return raw;
    if (raw === base || raw.startsWith(`${base}/`)) return raw;
    return `${base}${raw}`;
  } catch (_) {
    return href;
  }
}

function normalizeKey(value) {
  if (!value && value !== 0) return "";
  try {
    const str = String(value).trim();
    if (!str) return "";
    return str.replace(/\.html?$/i, "").replace(/\/+$/, "").toLowerCase();
  } catch (_) {
    return "";
  }
}

function createMarkerMap() {
  try {
    if (typeof globalThis !== "undefined" && typeof globalThis.Map === "function") {
      return new globalThis.Map();
    }
  } catch (_) {}
  try {
    if (typeof window !== "undefined" && typeof window.Map === "function") {
      return new window.Map();
    }
  } catch (_) {}
  const store = Object.create(null);
  return {
    has(key) {
      return Object.prototype.hasOwnProperty.call(store, key);
    },
    get(key) {
      return store[key];
    },
    set(key, value) {
      store[key] = value;
      return this;
    },
  };
}

function normalizeHex(value) {
  if (!value) return "";
  let input = String(value).trim();
  if (!input) return "";
  if (input.startsWith("var(")) return input;
  if (/^#[0-9a-f]{3}$/i.test(input)) {
    return input
      .replace(/^#/, "")
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .replace(/^/, "#");
  }
  if (/^#[0-9a-f]{6}$/i.test(input)) return input;
  return "";
}

function hexToRgb(hex) {
  if (!hex) return null;
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const int = parseInt(normalized.slice(1), 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHsl({r, g, b}) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / delta + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      case bn:
        h = (rn - gn) / delta + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }
  return {h: h * 360, s: s * 100, l: l * 100};
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) {
    r = c;
    g = x;
  } else if (hh >= 1 && hh < 2) {
    r = x;
    g = c;
  } else if (hh >= 2 && hh < 3) {
    g = c;
    b = x;
  } else if (hh >= 3 && hh < 4) {
    g = x;
    b = c;
  } else if (hh >= 4 && hh < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = light - c / 2;
  const rn = Math.round((r + m) * 255);
  const gn = Math.round((g + m) * 255);
  const bn = Math.round((b + m) * 255);
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(rn)}${toHex(gn)}${toHex(bn)}`;
}

function rotateHue(baseHue, degrees) {
  return (baseHue + degrees + 360) % 360;
}

function resolveAccentHex() {
  let value = "";
  try {
    if (typeof window !== "undefined") {
      const styles = window.getComputedStyle(document.documentElement);
      value = styles.getPropertyValue("--color-accent-default");
    }
  } catch (_) {}
  const normalized = normalizeHex(value);
  return normalized || DEFAULT_ACCENT_HEX;
}

function generateLegendColors(count) {
  if (!count || count <= 0) return [];
  const colors = [];
  const baseHex = resolveAccentHex();
  const accentVar = `var(--color-accent-default, ${baseHex})`;
  colors.push(accentVar);
  if (count === 1) return colors;
  const rgb = hexToRgb(baseHex);
  const baseHsl = rgb ? rgbToHsl(rgb) : {h: 220, s: 85, l: 56};
  const rotations = [180, 120, -120, 60, -60, 90, -90, 30, -30];
  const needed = count - 1;
  for (let i = 0; i < needed; i += 1) {
    const angle = rotations[i] != null ? rotations[i] : (360 / (needed + 1)) * (i + 1);
    const rotatedHue = rotateHue(baseHsl.h, angle);
    const hex = hslToHex(rotatedHue, baseHsl.s, baseHsl.l);
    colors.push(hex);
  }
  return colors;
}

function readIiifType(resource) {
  if (!resource) return "";
  const raw = resource.type || resource["@type"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const normalized = list
    .map((entry) => {
      try {
        return String(entry).toLowerCase();
      } catch (_) {
        return "";
      }
    })
    .filter(Boolean);
  if (normalized.some((value) => value.includes("manifest"))) return "manifest";
  if (normalized.some((value) => value.includes("collection"))) return "collection";
  return "";
}

function extractCollectionEntries(resource) {
  if (!resource || typeof resource !== "object") return [];
  const chunks = [];
  if (Array.isArray(resource.items)) chunks.push(resource.items);
  if (Array.isArray(resource.manifests)) chunks.push(resource.manifests);
  if (Array.isArray(resource.members)) chunks.push(resource.members);
  return chunks.flat();
}

function extractManifestKeysFromIiif(resource, fallback) {
  const fallbackKey = normalizeKey(fallback);
  if (!resource) return fallbackKey ? [fallbackKey] : [];
  const type = readIiifType(resource);
  if (type === "manifest") {
    const id = resource.id || resource["@id"] || fallback;
    const key = normalizeKey(id);
    return key ? [key] : fallbackKey ? [fallbackKey] : [];
  }
  if (type === "collection") {
    const seen = new Set();
    const keys = [];
    const queue = extractCollectionEntries(resource).slice();
    while (queue.length) {
      const entry = queue.shift();
      if (!entry || typeof entry !== "object") continue;
      const entryType = readIiifType(entry);
      if (entryType === "manifest") {
        const manifestId = entry.id || entry["@id"];
        const key = normalizeKey(manifestId);
        if (key && !seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      } else if (entryType === "collection") {
        queue.push(...extractCollectionEntries(entry));
      }
    }
    if (keys.length) return keys;
  }
  return fallbackKey ? [fallbackKey] : [];
}

function buildTileLayers(inputLayers, leaflet) {
  if (!leaflet) return [];
  const layers = Array.isArray(inputLayers) && inputLayers.length
    ? inputLayers
    : DEFAULT_TILE_LAYERS;
  return layers
    .map((entry) => {
      if (!entry || !entry.url) return null;
      const options = {};
      if (entry.attribution) options.attribution = entry.attribution;
      if (typeof entry.maxZoom === "number") options.maxZoom = entry.maxZoom;
      if (typeof entry.minZoom === "number") options.minZoom = entry.minZoom;
      if (entry.subdomains) options.subdomains = entry.subdomains;
      return {
        name: entry.name || entry.title || "Layer",
        layer: leaflet.tileLayer(entry.url, options),
      };
    })
    .filter(Boolean);
}

function buildMarkerIcon(marker, leaflet, colorOverride) {
  if (!leaflet) return null;
  const hasThumbnail = Boolean(marker && marker.thumbnail);
  const size = CUSTOM_MARKER_SIZE;
  const anchor = CUSTOM_MARKER_RADIUS;
  const color = colorOverride ? escapeHtml(colorOverride) : "";
  const thumbStyle = color ? ` style="border-color:${color}"` : "";
  const solidStyle = color ? ` style="background-color:${color}"` : "";
  const html = hasThumbnail
    ? `<div class="canopy-map__marker-thumb"${thumbStyle}><img src="${escapeHtml(
        marker.thumbnail
      )}" alt="" loading="lazy" /></div>`
    : `<span class="canopy-map__marker-solid"${solidStyle}></span>`;
  try {
    return leaflet.divIcon({
      className: "canopy-map__marker",
      iconSize: [size, size],
      iconAnchor: [anchor, anchor],
      popupAnchor: [0, CUSTOM_MARKER_POPUP_OFFSET],
      html,
    });
  } catch (_) {
    return null;
  }
}

function buildClusterOptions(leaflet) {
  if (!leaflet) return null;
  const size = CUSTOM_MARKER_SIZE;
  const anchor = CUSTOM_MARKER_RADIUS;
  return {
    chunkedLoading: true,
    iconCreateFunction: (cluster) => {
      const count = cluster && typeof cluster.getChildCount === "function"
        ? cluster.getChildCount()
        : 0;
      return leaflet.divIcon({
        html: `<div class="canopy-map__cluster">${count}</div>`,
        className: "canopy-map__cluster-wrapper",
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
      });
    },
  };
}

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function MapPopupContent({marker}) {
  if (!marker) return null;
  const title = marker.title || marker.manifestTitle || "";
  const summary = marker.summary || marker.manifestSummary || "";
  const href = marker.href ? withBasePath(marker.href) : "";
  const thumbnail = marker.thumbnail || "";
  const thumbWidth = marker.thumbnailWidth;
  const thumbHeight = marker.thumbnailHeight;
  const manifestLinks = Array.isArray(marker.manifests)
    ? marker.manifests.filter((entry) => entry && (entry.href || entry.title))
    : [];
  const normalizedManifests = manifestLinks.map((manifest) => ({
    ...manifest,
    href: manifest.href ? withBasePath(manifest.href) : manifest.href || "",
  }));

  return (
    <div className="canopy-map__popup">
      {thumbnail ? (
        <div className="canopy-map__popup-media">
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            width={
              typeof thumbWidth === "number" && thumbWidth > 0
                ? thumbWidth
                : undefined
            }
            height={
              typeof thumbHeight === "number" && thumbHeight > 0
                ? thumbHeight
                : undefined
            }
          />
        </div>
      ) : null}
      <div className="canopy-map__popup-body">
        {title ? (
          href ? (
            <a href={href} className="canopy-map__popup-title">
              {title}
            </a>
          ) : (
            <span className="canopy-map__popup-title">{title}</span>
          )
        ) : null}
        {summary ? (
          <p className="canopy-map__popup-summary">{summary}</p>
        ) : null}
        {marker.detailsHtml ? (
          <div
            className="canopy-map__popup-details"
            dangerouslySetInnerHTML={{__html: marker.detailsHtml}}
          />
        ) : null}
        {!summary && !marker.detailsHtml && href && !title ? (
          <a href={href} className="canopy-map__popup-link">
            View item
          </a>
        ) : null}
        {normalizedManifests.length ? (
          <div className="canopy-map__popup-manifests">
            <div className="canopy-map__popup-manifests-list">
              {normalizedManifests.map((manifest, index) => (
                <div
                  key={manifest.id || manifest.href || `manifest-${index}`}
                  className="canopy-map__popup-manifests-item"
                >
                  <ReferencedManifestCard manifest={manifest} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderPopup(marker) {
  if (!marker || typeof document === "undefined") return null;
  const container = document.createElement("div");
  let root = null;
  let hadError = false;

  const render = () => {
    if (hadError) return;
    try {
      if (!root) root = createRoot(container);
      root.render(<MapPopupContent marker={marker} />);
    } catch (error) {
      hadError = true;
      if (root) {
        try {
          root.unmount();
        } catch (_) {}
        root = null;
      }
      const fallbackTitle =
        marker.title || marker.summary || marker.href || "Location";
      container.innerHTML =
        `<div class=\"canopy-map__popup\"><div class=\"canopy-map__popup-body\">` +
        `<span class=\"canopy-map__popup-title\">${escapeHtml(fallbackTitle)}</span>` +
        `</div></div>`;
    }
  };

  const destroy = () => {
    if (!root) return;
    try {
      root.unmount();
    } catch (_) {}
    root = null;
  };

  render();

  return {
    element: container,
    render,
    destroy,
  };
}

function normalizeCustomMarkers(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => {
      if (!point) return null;
      const lat = Number(point.lat);
      const lng = Number(point.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: point.id || `${lat}-${lng}`,
        lat,
        lng,
        title: point.title || point.label || "",
        summary: point.summary || "",
        detailsHtml: point.detailsHtml || "",
        href: point.href || "",
        thumbnail: point.thumbnail || "",
        thumbnailWidth: point.thumbnailWidth,
        thumbnailHeight: point.thumbnailHeight,
        manifests: Array.isArray(point.manifests) ? point.manifests : [],
        type: "custom",
        keyValue: point.keyValue ? String(point.keyValue).trim() : "",
        keyLabel: typeof point.keyLabel === "string"
          ? point.keyLabel
          : point.keyLabel
          ? String(point.keyLabel)
          : "",
      };
    })
    .filter(Boolean);
}

function normalizeGeoReferenceEntry(entry, index) {
  if (entry == null) return null;
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed ? {id: trimmed, annotation: trimmed, options: null} : null;
  }
  if (typeof entry === "object") {
    const id = entry.id || entry.key;
    const options = entry.options && typeof entry.options === "object" ? entry.options : null;
    let annotation =
      entry.annotation ??
      entry.annotations ??
      entry.url ??
      entry.href ??
      entry.annotationUrl ??
      entry.source ??
      null;
    if (!annotation) {
      const looksLikeAnnotation =
        typeof entry.type === "string" && entry.target && entry.body;
      if (looksLikeAnnotation) annotation = entry;
    }
    if (typeof annotation === "string") {
      const trimmed = annotation.trim();
      if (!trimmed) return null;
      return {
        id: id || trimmed,
        annotation: trimmed,
        options,
      };
    }
    if (annotation && typeof annotation === "object") {
      return {
        id: id || annotation.id || `geo-reference-${index + 1}`,
        annotation,
        options,
      };
    }
  }
  return null;
}

function normalizeGeoReferences(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((entry, index) => normalizeGeoReferenceEntry(entry, index))
    .filter(Boolean);
}

function extractNavMarkers(data, allowedKeys) {
  if (!data || !Array.isArray(data.manifests)) return [];
  const keys = allowedKeys instanceof Set ? allowedKeys : new Set();
  if (!keys.size) return [];
  const markers = [];
  data.manifests.forEach((entry) => {
    if (!entry || !Array.isArray(entry.features)) return;
    const manifestKeys = new Set([
      normalizeKey(entry.id),
      normalizeKey(entry.href),
      normalizeKey(entry.slug),
    ].filter(Boolean));
    const hasMatch = Array.from(manifestKeys).some((key) => keys.has(key));
    if (!hasMatch) return;
    const matchKeys = Array.from(manifestKeys);
    entry.features.forEach((feature, index) => {
      if (!feature) return;
      const lat = Number(feature.lat);
      const lng = Number(feature.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const id = feature.id || `${entry.id || entry.slug || "feature"}-${index}`;
      markers.push({
        id,
        lat,
        lng,
        title: feature.label || entry.title || "",
        summary: feature.summary || entry.summary || "",
        href: entry.href || "",
        thumbnail: entry.thumbnail || "",
        thumbnailWidth: entry.thumbnailWidth,
        thumbnailHeight: entry.thumbnailHeight,
        manifestTitle: entry.title || "",
        manifestSummary: entry.summary || "",
        type: "navPlace",
        matchKeys,
      });
    });
  });
  return markers;
}

function normalizeCenterInput(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const parts = value.split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return {lat, lng};
    }
    return null;
  }
  if (typeof value === "object") {
    const lat = Number(value.lat ?? value.latitude ?? value.y);
    const lng = Number(value.lng ?? value.lon ?? value.long ?? value.longitude ?? value.x);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return {lat, lng};
  }
  return null;
}

export default function Map({
  className = "",
  id = null,
  style = null,
  height = "600px",
  keyConfig = [],
  mapKey = [],
  legend = [],
  geoReferences = [],
  tileLayers = [],
  scrollWheelZoom = false,
  cluster = true,
  customPoints = [],
  navDataset = null,
  iiifContent = null,
  defaultCenter = null,
  defaultZoom = null,
} = {}) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const layerRef = React.useRef(null);
  const [leafletLib, setLeafletLib] = React.useState(() => resolveGlobalLeaflet());
  const [leafletError, setLeafletError] = React.useState(null);
  const datasetInfo = navDataset && typeof navDataset === "object" ? navDataset : null;
  const datasetHref = (datasetInfo && datasetInfo.href) || "/api/navplace.json";
  const datasetVersion = datasetInfo && datasetInfo.version;
  const datasetHasFeatures = !!(datasetInfo && datasetInfo.hasFeatures);
  const [navState, setNavState] = React.useState(() => ({
    loading: false,
    error: null,
    markers: [],
  }));
  const [iiifTargets, setIiifTargets] = React.useState(() => ({
    loading: false,
    error: null,
    keys: [],
  }));

  React.useEffect(() => {
    if (!iiifContent) {
      setIiifTargets({loading: false, error: null, keys: []});
      return;
    }
    if (typeof iiifContent === "object") {
      const keys = extractManifestKeysFromIiif(iiifContent, "");
      setIiifTargets({
        loading: false,
        error: keys.length ? null : "No IIIF manifests were found for this resource.",
        keys,
      });
      return;
    }
    const target = String(iiifContent || "").trim();
    if (!target) {
      setIiifTargets({loading: false, error: null, keys: []});
      return;
    }
    let cancelled = false;
    setIiifTargets({loading: true, error: null, keys: []});
    const iiifUrl = withBasePath(target);
    fetch(iiifUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load IIIF content (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const keys = extractManifestKeysFromIiif(json, target);
        setIiifTargets({
          loading: false,
          error: keys.length ? null : "No IIIF manifests were found for this resource.",
          keys,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setIiifTargets({
          loading: false,
          error:
            error && error.message ? error.message : "Failed to load IIIF content",
          keys: [],
        });
      });
    return () => {
      cancelled = true;
    };
  }, [iiifContent]);

  const navTargets = iiifTargets.keys || [];
  const navTargetsKey = navTargets.join("|");
  const shouldFetchNav = datasetHasFeatures && navTargets.length > 0;

  React.useEffect(() => {
    if (!shouldFetchNav) {
      setNavState({loading: false, error: null, markers: []});
      return undefined;
    }
    let cancelled = false;
    setNavState({loading: true, error: null, markers: []});
    const url = (() => {
      const base = withBasePath(datasetHref);
      if (!datasetVersion) return base;
      const joiner = base.includes("?") ? "&" : "?";
      return `${base}${joiner}v=${encodeURIComponent(datasetVersion)}`;
    })();
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load map data (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const markers = extractNavMarkers(json, new Set(navTargets));
        setNavState({loading: false, error: null, markers});
      })
      .catch((error) => {
        if (cancelled) return;
        setNavState({
          loading: false,
          error: error && error.message ? error.message : "Failed to load map data",
          markers: [],
        });
      });
    return () => {
      cancelled = true;
    };
  }, [datasetHref, datasetVersion, navTargetsKey, shouldFetchNav]);

  React.useEffect(() => {
    if (leafletLib) return;
    let cancelled = false;
    waitForLeaflet()
      .then((lib) => {
        if (!cancelled) setLeafletLib(lib);
      })
      .catch((error) => {
        if (!cancelled) setLeafletError(error);
      });
    return () => {
      cancelled = true;
    };
  }, [leafletLib]);

  const navMatchMap = React.useMemo(() => {
    const matchMap = createMarkerMap();
    (navState.markers || []).forEach((marker) => {
      if (!marker || !Array.isArray(marker.matchKeys)) return;
      marker.matchKeys.forEach((key) => {
        if (!key || matchMap.has(key)) return;
        matchMap.set(key, marker);
      });
    });
    return matchMap;
  }, [navState.markers]);

  const normalizedCustom = React.useMemo(() => {
    return normalizeCustomMarkers(customPoints).map((point) => {
      if (!point || point.thumbnail || !point.href) return point;
      const match = navMatchMap.get(normalizeKey(point.href));
      if (!match || !match.thumbnail) return point;
      return {
        ...point,
        thumbnail: match.thumbnail,
        thumbnailWidth: match.thumbnailWidth || point.thumbnailWidth,
        thumbnailHeight: match.thumbnailHeight || point.thumbnailHeight,
        manifestTitle: match.manifestTitle || point.manifestTitle,
        manifestSummary: match.manifestSummary || point.manifestSummary,
      };
    });
  }, [customPoints, navMatchMap]);

  const allMarkers = React.useMemo(() => {
    return [...(navState.markers || []), ...normalizedCustom];
  }, [navState.markers, normalizedCustom]);

  const normalizedGeoReferences = React.useMemo(
    () => normalizeGeoReferences(geoReferences),
    [geoReferences]
  );

  const resolvedKeyInput = React.useMemo(() => {
    if (Array.isArray(keyConfig) && keyConfig.length) return keyConfig;
    if (Array.isArray(mapKey) && mapKey.length) return mapKey;
    if (Array.isArray(legend) && legend.length) return legend;
    return [];
  }, [keyConfig, mapKey, legend]);

  const normalizedLegendConfig = React.useMemo(() => {
    if (!Array.isArray(resolvedKeyInput) || !resolvedKeyInput.length) return [];
    return resolvedKeyInput
      .map((entry) => {
        if (!entry) return null;
        const value = entry.id || entry.value || entry.key;
        const label = entry.label || entry.name || entry.title;
        if (!value || !label) return null;
        return {
          keyValue: String(value).trim(),
          label: String(label).trim(),
        };
      })
      .filter(Boolean);
  }, [resolvedKeyInput]);

  const markerKeyData = React.useMemo(() => {
    if (!normalizedLegendConfig.length) return {groups: [], colorMap: null};
    const colorMap = createMarkerMap();
    const palette = generateLegendColors(normalizedLegendConfig.length);
    const groups = normalizedLegendConfig.map((entry, index) => {
      const color = palette[index] || palette[0] || DEFAULT_ACCENT_HEX;
      colorMap.set(entry.keyValue, color);
      return {
        keyValue: entry.keyValue,
        label: entry.label,
        color,
      };
    });
    return {groups, colorMap};
  }, [normalizedLegendConfig]);
  const markerKeyGroups = markerKeyData.groups;
  const markerKeyColorMap = markerKeyData.colorMap;

  const clusterOptions = React.useMemo(() => buildClusterOptions(leafletLib), [leafletLib]);

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current || !leafletLib) return undefined;
    const map = leafletLib.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: scrollWheelZoom === true,
    });
    mapRef.current = map;
    const layers = buildTileLayers(tileLayers, leafletLib);
    const layerControlEntries = {};
    layers.forEach((entry, index) => {
      try {
        if (index === 0) entry.layer.addTo(map);
        layerControlEntries[entry.name || `Layer ${index + 1}`] = entry.layer;
      } catch (_) {}
    });
    if (Object.keys(layerControlEntries).length > 1) {
      leafletLib.control.layers(layerControlEntries, {}).addTo(map);
    }
    const supportsClusters = typeof leafletLib.markerClusterGroup === "function";
    const layerGroup = cluster !== false && supportsClusters
      ? leafletLib.markerClusterGroup(clusterOptions || {chunkedLoading: true})
      : leafletLib.layerGroup();
    layerGroup.addTo(map);
    layerRef.current = layerGroup;
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 0);
    return () => {
      try {
        map.remove();
      } catch (_) {}
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [tileLayers, scrollWheelZoom, cluster, clusterOptions, leafletLib]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !leafletLib) return undefined;
    if (!normalizedGeoReferences.length) return undefined;
    let cancelled = false;
    const layers = [];
    import("@allmaps/leaflet")
      .then((mod) => {
        if (cancelled) return;
        const LayerCtor = mod && (mod.WarpedMapLayer || mod.default);
        if (!LayerCtor) return;
        normalizedGeoReferences.forEach((entry) => {
          if (!entry || !entry.annotation) return;
          try {
            const layer = new LayerCtor(entry.annotation, entry.options || undefined);
            if (typeof layer.addTo === "function") {
              layer.addTo(map);
            } else if (typeof map.addLayer === "function") {
              map.addLayer(layer);
            }
            layers.push(layer);
          } catch (_) {}
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      layers.forEach((layer) => {
        try {
          if (typeof layer.remove === "function") {
            layer.remove();
          } else if (map && typeof map.removeLayer === "function") {
            map.removeLayer(layer);
          }
        } catch (_) {}
      });
    };
  }, [leafletLib, normalizedGeoReferences]);

  React.useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !leafletLib) return;
    try {
      layer.clearLayers();
    } catch (_) {}
    const bounds = [];
  const popupCleanups = [];

  allMarkers.forEach((marker) => {
      if (!marker || !Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return;
      const latlng = leafletLib.latLng(marker.lat, marker.lng);
      bounds.push(latlng);
      const colorOverride =
        marker.type === "custom" && markerKeyColorMap && marker.keyValue
          ? markerKeyColorMap.get(String(marker.keyValue).trim())
          : null;
      const icon = buildMarkerIcon(marker, leafletLib, colorOverride);
      const leafletMarker = leafletLib.marker(latlng, icon ? {icon} : undefined);
      const popup = renderPopup(marker);
      if (popup && popup.element) {
        try {
          leafletMarker.bindPopup(popup.element);
          if (typeof popup.render === "function") {
            leafletMarker.on("popupopen", popup.render);
          }
          popupCleanups.push(() => {
            if (typeof popup.render === "function") {
              try {
                leafletMarker.off("popupopen", popup.render);
              } catch (_) {}
            }
            if (typeof popup.destroy === "function") {
              popup.destroy();
            }
          });
        } catch (_) {
          if (typeof popup.destroy === "function") {
            popup.destroy();
          }
        }
      } else if (popup && typeof popup.destroy === "function") {
        popup.destroy();
      }
      try {
        layer.addLayer(leafletMarker);
      } catch (_) {}
  });
    const centerOverride = normalizeCenterInput(defaultCenter);
    const hasDefaultZoom = Number.isFinite(defaultZoom);
    if (hasDefaultZoom) {
      let targetCenter = centerOverride;
      if (!targetCenter && bounds.length) {
        try {
          const mapBounds = leafletLib.latLngBounds(bounds);
          const center = mapBounds.getCenter();
          targetCenter = {lat: center.lat, lng: center.lng};
        } catch (_) {}
      }
      try {
        if (targetCenter) {
          map.setView([targetCenter.lat, targetCenter.lng], defaultZoom);
        } else {
          map.setZoom(defaultZoom);
        }
      } catch (_) {}
      return;
    }
    if (bounds.length) {
      try {
        const mapBounds = leafletLib.latLngBounds(bounds);
        map.fitBounds(mapBounds, {padding: [32, 32]});
      } catch (_) {}
      return;
    }
    if (centerOverride) {
      try {
        map.setView([centerOverride.lat, centerOverride.lng], 2);
      } catch (_) {}
    }

    return () => {
      popupCleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch (_) {}
      });
    };
  }, [allMarkers, defaultCenter, defaultZoom, leafletLib]);

  const isLoadingMarkers = iiifTargets.loading || navState.loading;
  const hasMarkers = allMarkers.length > 0;
  const hasGeoReferences = normalizedGeoReferences.length > 0;
  const hasCustomPoints = normalizedCustom.length > 0;
  const hasKey = markerKeyGroups.length > 0;
  const datasetUnavailable = navTargets.length > 0 && !datasetHasFeatures;
  const rootClass = [
    "canopy-map",
    className,
    isLoadingMarkers ? "canopy-map--loading" : null,
    iiifTargets.error || navState.error || datasetUnavailable ? "canopy-map--error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const statusLabel = leafletError
    ? leafletError.message || "Failed to load map library"
    : !leafletLib
    ? "Loading map…"
    : iiifTargets.error
    ? iiifTargets.error
    : datasetUnavailable
    ? "Map data is unavailable for this site."
    : navState.error
    ? navState.error
    : isLoadingMarkers
    ? "Loading map data…"
    : !iiifContent && !hasCustomPoints && !hasGeoReferences
    ? "Add iiifContent or MapPoint markers to populate this map."
    : !hasMarkers && !hasGeoReferences
    ? "No map locations available."
    : "";
  const showStatus = Boolean(statusLabel);

  const mapElement = (
    <div className={rootClass} id={id || undefined} style={style || undefined}>
      <div
        ref={containerRef}
        className="canopy-map__canvas"
        style={{height: height || "600px"}}
      />
      {showStatus ? (
        <div className="canopy-map__overlays">
          <div className="canopy-map__status" aria-live="polite">
            {statusLabel}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (!hasKey) return mapElement;

  return (
    <React.Fragment>
      {mapElement}
      <div className="canopy-map__key" aria-label="Map key">
        <ul className="canopy-map__key-list">
          {markerKeyGroups.map((group) => (
            <li key={group.label} className="canopy-map__key-item">
              <span
                className="canopy-map__key-dot"
                aria-hidden="true"
                style={{backgroundColor: group.color || undefined}}
              />
              <span className="canopy-map__key-label">{group.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </React.Fragment>
  );
}
