import React from "react";
import ReactDOMServer from "react-dom/server";
import Timeline from "./Timeline.jsx";
import TimelinePoint from "./TimelinePoint.jsx";
import navigationHelpers from "../../../../lib/components/navigation.js";
import {
  createLocale,
  buildPointMetadata,
} from "./date-utils.js";

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

function useReferencedManifestMap() {
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
      map.set(normalized, item);
      map.set(String(id), item);
    });
    return map;
  }, [referencedItems]);
}

function normalizeResource(resource, index) {
  if (!resource) return null;
  const href = resource.href || resource.id || "";
  const label = resource.label || resource.title || href || `Resource ${index + 1}`;
  return {
    id: resource.id || href || `timeline-resource-${index}`,
    href,
    label,
    type: resource.type || "IIIF",
    thumbnail: resource.thumbnail || null,
    summary: resource.summary || null,
  };
}

function normalizePoint(child, index, options) {
  if (!React.isValidElement(child)) return null;
  if (child.type !== TimelinePoint && child.type?.displayName !== "TimelinePoint")
    return null;
  const props = child.props || {};
  const id = props.id || `timeline-point-${index}`;
  const granularity =
    props.precision ||
    props.granularity ||
    (options && options.range && options.range.granularity) ||
    "year";
  const value =
    props.date ??
    props.value ??
    props.timestamp ??
    props.year ??
    props.label ??
    props.title;
  const meta = buildPointMetadata({
    value,
    granularity,
    locale: options.locale,
  });
  let detailsHtml = "";
  try {
    if (props.children) {
      detailsHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(React.Fragment, null, props.children)
      );
    }
  } catch (_) {
    detailsHtml = "";
  }
  const resources = Array.isArray(props.iiifResources)
    ? props.iiifResources.map(normalizeResource).filter(Boolean)
    : [];
  const manifestValues = Array.isArray(props.referencedManifests)
    ? props.referencedManifests
    : props.manifest
    ? [props.manifest]
    : Array.isArray(props.manifests)
    ? props.manifests
    : [];
  const manifests = resolveManifestReferences(manifestValues, options.manifestMap);
  return {
    id,
    title: props.title || props.label || `Point ${index + 1}`,
    summary: props.summary || props.description || "",
    description: props.description || "",
    highlight: props.highlight === true || props.highlight === "true",
    side: props.side || props.align || props.alignment || null,
    meta: {
      label: meta.label,
      timestamp: meta.timestamp,
    },
    detailsHtml,
    resources,
    manifests,
  };
}

function resolveManifestReferences(ids, manifestMap) {
  if (!Array.isArray(ids) || !ids.length || !manifestMap) return [];
  const seen = new Set();
  const out = [];
  ids.forEach((value) => {
    if (!value) return;
    const normalized = normalizeManifestId(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    const record = manifestMap.get(normalized);
    if (!record) return;
    out.push({
      id: record.id || value,
      href: record.href || null,
      title: record.title || record.href || value,
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

function serializeProps(props, payload, locale) {
  const clone = {};
  Object.keys(props || {}).forEach((key) => {
    if (key === "children") return;
    const value = props[key];
    if (typeof value === "function" || typeof value === "symbol") return;
    clone[key] = value;
  });
  clone.locale = locale;
  clone.__canopyTimeline = payload;
  return clone;
}

function serializeForScript(data) {
  try {
    return JSON.stringify(data).replace(/</g, "\\u003c");
  } catch (_) {
    return "{}";
  }
}

export default function MdxTimeline({ children, ...rest }) {
  const localeValue = rest.locale || "en-US";
  const localeObj = createLocale(localeValue);
  const localeBase =
    typeof localeObj === "string" ? localeObj : localeObj.baseName || "en-US";
  const manifestMap = useReferencedManifestMap();
  const childArray = React.Children.toArray(children);
  const points = childArray
    .map((child, index) =>
      normalizePoint(child, index, {
        range: rest.range || {},
        locale: localeObj,
        manifestMap,
      })
    )
    .filter(Boolean);
  const payload = {
    points,
    locale: localeBase,
    range: rest.range || null,
    threshold: rest.threshold != null ? rest.threshold : null,
    steps: rest.steps != null ? rest.steps : null,
  };
  const json = serializeForScript(serializeProps(rest, payload, localeBase));
  return (
    <div data-canopy-timeline="1">
      <Timeline {...rest} __canopyTimeline={payload} />
      <script
        type="application/json"
        dangerouslySetInnerHTML={{ __html: json }}
      />
    </div>
  );
}
