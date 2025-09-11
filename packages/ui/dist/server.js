// src/Fallback.jsx
import React from "react";
function Fallback({ name, ...props }) {
  const style = {
    padding: "0.75rem 1rem",
    border: "1px dashed #d1d5db",
    color: "#6b7280",
    borderRadius: 6,
    background: "#f9fafb",
    fontSize: 14
  };
  return /* @__PURE__ */ React.createElement("div", { style, "data-fallback-component": name || "Unknown" }, /* @__PURE__ */ React.createElement("strong", null, name || "Unknown component"), " not available in UI.");
}

// src/HelloWorld.jsx
import React2 from "react";
var HelloWorld = () => {
  return /* @__PURE__ */ React2.createElement("div", null, "Hello, World!");
};

// src/iiif/Viewer.jsx
import React3, { useEffect, useState } from "react";
var DEFAULT_VIEWER_OPTIONS = {
  showDownload: false,
  showIIIFBadge: false,
  showTitle: false,
  informationPanel: {
    open: false,
    renderAbout: false,
    renderToggle: false
  }
};
function isPlainObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}
function deepMerge(base, override) {
  if (!isPlainObject(base)) return override;
  const out = { ...base };
  if (!isPlainObject(override)) return out;
  for (const key of Object.keys(override)) {
    const a = base[key];
    const b = override[key];
    if (isPlainObject(a) && isPlainObject(b)) out[key] = deepMerge(a, b);
    else out[key] = b;
  }
  return out;
}
var Viewer = (props) => {
  const [CloverViewer, setCloverViewer] = useState(null);
  const mergedOptions = deepMerge(
    DEFAULT_VIEWER_OPTIONS,
    props && props.options
  );
  useEffect(() => {
    let mounted = true;
    const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/viewer").then((mod) => {
        if (!mounted) return;
        const Comp = mod && (mod.default || mod.Viewer || mod);
        setCloverViewer(() => Comp);
      }).catch(() => {
      });
    }
    return () => {
      mounted = false;
    };
  }, []);
  if (!CloverViewer) {
    let json = "{}";
    try {
      const p = { ...props || {} };
      if (mergedOptions) p.options = mergedOptions;
      json = JSON.stringify(p);
    } catch (_) {
      json = "{}";
    }
    return /* @__PURE__ */ React3.createElement("div", { "data-canopy-viewer": "1", className: "not-prose" }, /* @__PURE__ */ React3.createElement(
      "script",
      {
        type: "application/json",
        dangerouslySetInnerHTML: { __html: json }
      }
    ));
  }
  return /* @__PURE__ */ React3.createElement(CloverViewer, { ...props, options: mergedOptions });
};

// src/iiif/Slider.jsx
import React4, { useEffect as useEffect2, useState as useState2 } from "react";
var Slider = (props) => {
  const [CloverSlider, setCloverSlider] = useState2(null);
  useEffect2(() => {
    let mounted = true;
    const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/slider").then((mod) => {
        if (!mounted) return;
        console.log(mod);
        const Comp = mod && (mod.default || mod.Slider || mod);
        setCloverSlider(() => Comp);
      }).catch(() => {
      });
    }
    return () => {
      mounted = false;
    };
  }, []);
  if (!CloverSlider) {
    let json = "{}";
    try {
      json = JSON.stringify(props || {});
    } catch (_) {
      json = "{}";
    }
    return /* @__PURE__ */ React4.createElement("div", { "data-canopy-slider": "1", className: "not-prose" }, /* @__PURE__ */ React4.createElement(
      "script",
      {
        type: "application/json",
        dangerouslySetInnerHTML: { __html: json }
      }
    ));
  }
  return /* @__PURE__ */ React4.createElement(CloverSlider, { ...props });
};

// src/iiif/MdxRelatedItems.jsx
import React5 from "react";
function MdxRelatedItems(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React5.createElement("div", { "data-canopy-related-items": "1", className: "not-prose" }, /* @__PURE__ */ React5.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/MdxSearchForm.jsx
import React6 from "react";
function MdxSearchForm(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React6.createElement("div", { "data-canopy-search-form": "1" }, /* @__PURE__ */ React6.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/MdxSearchResults.jsx
import React7 from "react";
function MdxSearchResults(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React7.createElement("div", { "data-canopy-search-results": "1" }, /* @__PURE__ */ React7.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchSummary.jsx
import React8 from "react";
function SearchSummary(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React8.createElement("div", { "data-canopy-search-summary": "1" }, /* @__PURE__ */ React8.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchTotal.jsx
import React9 from "react";
function SearchTotal(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React9.createElement("div", { "data-canopy-search-total": "1" }, /* @__PURE__ */ React9.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}
export {
  Fallback,
  HelloWorld,
  MdxRelatedItems as RelatedItems,
  MdxSearchForm as SearchForm,
  MdxSearchResults as SearchResults,
  SearchSummary,
  SearchTotal,
  Slider,
  Viewer
};
//# sourceMappingURL=server.js.map
