import React from "react";
import ReactDOMServer from "react-dom/server";
import Timeline from "./Timeline.jsx";
import TimelinePoint from "./TimelinePoint.jsx";
import {
  createLocale,
  buildPointMetadata,
} from "./date-utils.js";
import {
  useReferencedManifestMap,
  resolveReferencedManifests,
} from "../../utils/manifestReferences.js";

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
  const manifests = resolveReferencedManifests(manifestValues, options.manifestMap);
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
