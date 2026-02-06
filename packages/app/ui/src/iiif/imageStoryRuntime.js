const STORIIIES_STYLE_URL =
  "https://unpkg.com/@cogapp/storiiies-viewer@latest/dist/storiiies-viewer.css";
const STORIIIES_SCRIPT_URL =
  "https://unpkg.com/@cogapp/storiiies-viewer@latest/dist/umd/storiiies-viewer.js";

const assetLoaders = new Map();

function loadAsset(kind, url) {
  if (!assetLoaders.has(url)) {
    assetLoaders.set(
      url,
      new Promise((resolve, reject) => {
        try {
          const tag = document.createElement(kind === "script" ? "script" : "link");
          if (kind === "script") {
            tag.setAttribute("src", url);
            tag.setAttribute("async", "true");
          } else {
            tag.setAttribute("rel", "stylesheet");
            tag.setAttribute("href", url);
          }
          tag.addEventListener("load", () => resolve(), {once: true});
          tag.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), {
            once: true,
          });
          document.head.appendChild(tag);
        } catch (error) {
          reject(error);
        }
      }),
    );
  }
  return assetLoaders.get(url);
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
    if (normalized || normalized === "") {
      cachedBasePath = normalized;
      return cachedBasePath;
    }
  }
  cachedBasePath = "";
  return cachedBasePath;
}

function withBasePath(href) {
  if (typeof href !== "string") return href;
  const raw = href.trim();
  if (!raw) return href;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return raw;
  if (!raw.startsWith("/")) return raw;
  const base = readBasePath();
  if (!base || base === "/") return raw;
  if (raw === base || raw.startsWith(`${base}/`)) return raw;
  return `${base}${raw}`;
}

export function sanitizeImageStoryProps(raw = {}) {
  const props = raw && typeof raw === "object" ? raw : {};
  const out = {};
  if (typeof props.iiifContent === "string" && props.iiifContent.trim()) {
    out.iiifContent = props.iiifContent.trim();
  }
  if (typeof props.disablePanAndZoom === "boolean") {
    out.disablePanAndZoom = props.disablePanAndZoom;
  }
  if (
    typeof props.pointOfInterestSvgUrl === "string" &&
    props.pointOfInterestSvgUrl.trim()
  ) {
    out.pointOfInterestSvgUrl = props.pointOfInterestSvgUrl.trim();
  }
  if (props.viewerOptions && typeof props.viewerOptions === "object") {
    out.viewerOptions = props.viewerOptions;
  }
  return out;
}

export function serializeImageStoryProps(raw = {}) {
  try {
    return JSON.stringify(sanitizeImageStoryProps(raw));
  } catch (_) {
    try {
      return JSON.stringify({
        iiifContent: raw && raw.iiifContent ? raw.iiifContent : "",
      });
    } catch (err) {
      return "{}";
    }
  }
}

function resolveViewerConfig(element, props) {
  const sanitized = sanitizeImageStoryProps(props);
  const viewerOptions =
    sanitized.viewerOptions && typeof sanitized.viewerOptions === "object"
      ? sanitized.viewerOptions
      : {};
  const config = { ...viewerOptions, container: element };
  if (sanitized.iiifContent) {
    config.manifestUrl = withBasePath(sanitized.iiifContent);
  }
  if (typeof sanitized.disablePanAndZoom === "boolean") {
    config.disablePanAndZoom = sanitized.disablePanAndZoom;
  }
  if (sanitized.pointOfInterestSvgUrl) {
    config.pointOfInterestSvgUrl = withBasePath(sanitized.pointOfInterestSvgUrl);
  }
  return config;
}

async function ensureStoriiiesAssets() {
  await Promise.all([
    loadAsset("style", STORIIIES_STYLE_URL),
    loadAsset("script", STORIIIES_SCRIPT_URL),
  ]);
}

export async function mountImageStory(element, props = {}) {
  if (typeof window === "undefined" || !element) return null;
  await ensureStoriiiesAssets();
  const { StoriiiesViewer } = window;
  if (!StoriiiesViewer || typeof StoriiiesViewer !== "function") return null;
  const config = resolveViewerConfig(element, props);
  if (!config.manifestUrl) return null;
  const viewer = new StoriiiesViewer(config);
  return () => {
    try {
      viewer && typeof viewer.destroy === "function" && viewer.destroy();
    } catch (_) {}
  };
}
