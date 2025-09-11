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

// src/layout/Card.jsx
import React3, { useEffect, useRef, useState } from "react";
function Card({
  href,
  src,
  alt,
  title,
  subtitle,
  // Optional intrinsic dimensions or aspect ratio to compute a responsive height
  imgWidth,
  imgHeight,
  aspectRatio,
  className,
  style,
  children,
  ...rest
}) {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof IntersectionObserver !== "function") {
      setInView(true);
      return;
    }
    const el = containerRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            try {
              obs.unobserve(el);
            } catch (_) {
            }
            break;
          }
        }
      },
      { root: null, rootMargin: "100px", threshold: 0.1 }
    );
    try {
      obs.observe(el);
    } catch (_) {
    }
    return () => {
      try {
        obs.disconnect();
      } catch (_) {
      }
    };
  }, []);
  const w = Number(imgWidth);
  const h = Number(imgHeight);
  const ratio = Number.isFinite(Number(aspectRatio)) && Number(aspectRatio) > 0 ? Number(aspectRatio) : Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0 ? w / h : void 0;
  const paddingPercent = ratio ? 100 / ratio : 100;
  const caption = /* @__PURE__ */ React3.createElement("figcaption", null, title && /* @__PURE__ */ React3.createElement("span", null, title), subtitle && /* @__PURE__ */ React3.createElement("span", null, subtitle), children);
  return /* @__PURE__ */ React3.createElement(
    "a",
    {
      href,
      className: ["canopy-card", className].filter(Boolean).join(" "),
      style,
      ref: containerRef,
      "data-aspect-ratio": ratio,
      "data-in-view": inView ? "true" : "false",
      "data-image-loaded": imageLoaded ? "true" : "false",
      ...rest
    },
    /* @__PURE__ */ React3.createElement("figure", null, src ? ratio ? /* @__PURE__ */ React3.createElement(
      "div",
      {
        className: "canopy-card-media",
        style: { "--canopy-card-padding": `${paddingPercent}%` }
      },
      inView ? /* @__PURE__ */ React3.createElement(
        "img",
        {
          src,
          alt: alt || title || "",
          loading: "lazy",
          onLoad: () => setImageLoaded(true),
          onError: () => setImageLoaded(true)
        }
      ) : null
    ) : /* @__PURE__ */ React3.createElement(
      "img",
      {
        src,
        alt: alt || title || "",
        loading: "lazy",
        onLoad: () => setImageLoaded(true),
        onError: () => setImageLoaded(true),
        className: "canopy-card-image"
      }
    ) : null, caption)
  );
}

// src/layout/Grid.jsx
import Masonry from "react-masonry-css";
import React4 from "react";
function GridItem({ children, className = "", style = {}, ...rest }) {
  return /* @__PURE__ */ React4.createElement(
    "div",
    {
      className: `canopy-grid-item ${className}`.trim(),
      style,
      ...rest
    },
    children
  );
}
function Grid({
  breakpointCols,
  gap = "2rem",
  paddingY = "0",
  className = "",
  style = {},
  columnClassName = "canopy-grid-column",
  children,
  ...rest
}) {
  const cols = breakpointCols || {
    default: 6,
    1280: 5,
    1024: 4,
    768: 3,
    640: 2
  };
  const vars = { "--grid-gap": gap, "--grid-padding-y": paddingY };
  return /* @__PURE__ */ React4.createElement("div", { className: "canopy-grid-wrap" }, /* @__PURE__ */ React4.createElement(
    "style",
    {
      dangerouslySetInnerHTML: {
        __html: `
            .canopy-grid { display: flex; width: auto; position: relative; padding: var(--grid-padding-y, 0) 0; z-index: 1; }
            .canopy-grid .${columnClassName} { margin-left: var(--grid-gap, 1rem); }
            .canopy-grid .${columnClassName}:first-child { margin-left: 0; }
            .canopy-grid-item { margin-bottom: var(--grid-gap, 1rem); }
          `
      }
    }
  ), /* @__PURE__ */ React4.createElement(
    Masonry,
    {
      breakpointCols: cols,
      className: `canopy-grid ${className}`.trim(),
      columnClassName,
      style: { ...vars, ...style },
      ...rest
    },
    children
  ));
}

// src/iiif/Viewer.jsx
import React5, { useEffect as useEffect2, useState as useState2 } from "react";
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
  const [CloverViewer, setCloverViewer] = useState2(null);
  const mergedOptions = deepMerge(
    DEFAULT_VIEWER_OPTIONS,
    props && props.options
  );
  useEffect2(() => {
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
    return /* @__PURE__ */ React5.createElement("div", { "data-canopy-viewer": "1", className: "not-prose" }, /* @__PURE__ */ React5.createElement(
      "script",
      {
        type: "application/json",
        dangerouslySetInnerHTML: { __html: json }
      }
    ));
  }
  return /* @__PURE__ */ React5.createElement(CloverViewer, { ...props, options: mergedOptions });
};

// src/iiif/Slider.jsx
import React6, { useEffect as useEffect3, useState as useState3 } from "react";
var Slider = (props) => {
  const [CloverSlider, setCloverSlider] = useState3(null);
  useEffect3(() => {
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
    return /* @__PURE__ */ React6.createElement("div", { "data-canopy-slider": "1", className: "not-prose" }, /* @__PURE__ */ React6.createElement(
      "script",
      {
        type: "application/json",
        dangerouslySetInnerHTML: { __html: json }
      }
    ));
  }
  return /* @__PURE__ */ React6.createElement(CloverSlider, { ...props });
};

// src/iiif/MdxRelatedItems.jsx
import React7 from "react";
function MdxRelatedItems(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React7.createElement("div", { "data-canopy-related-items": "1", className: "not-prose" }, /* @__PURE__ */ React7.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/MdxSearchForm.jsx
import React8 from "react";
function MdxSearchForm(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React8.createElement("div", { "data-canopy-search-form": "1" }, /* @__PURE__ */ React8.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/MdxSearchResults.jsx
import React9 from "react";
function MdxSearchResults(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React9.createElement("div", { "data-canopy-search-results": "1" }, /* @__PURE__ */ React9.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchSummary.jsx
import React10 from "react";
function SearchSummary(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React10.createElement("div", { "data-canopy-search-summary": "1" }, /* @__PURE__ */ React10.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchTotal.jsx
import React11 from "react";
function SearchTotal(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React11.createElement("div", { "data-canopy-search-total": "1" }, /* @__PURE__ */ React11.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchForm.jsx
import React12 from "react";
function SearchForm({ query, onQueryChange, type = "all", onTypeChange, types = [] }) {
  const allTypes = Array.from(/* @__PURE__ */ new Set(["all", ...types]));
  return /* @__PURE__ */ React12.createElement("form", { onSubmit: (e) => e.preventDefault(), className: "space-y-2" }, /* @__PURE__ */ React12.createElement(
    "input",
    {
      id: "search-input",
      type: "search",
      value: query,
      placeholder: "Type to search\u2026",
      onChange: (e) => onQueryChange && onQueryChange(e.target.value),
      className: "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
    }
  ), /* @__PURE__ */ React12.createElement("div", { className: "flex items-center gap-3 text-sm text-slate-600" }, /* @__PURE__ */ React12.createElement("label", { htmlFor: "search-type" }, "Type:"), /* @__PURE__ */ React12.createElement(
    "select",
    {
      id: "search-type",
      value: type,
      onChange: (e) => onTypeChange && onTypeChange(e.target.value),
      className: "px-2 py-1 border border-slate-300 rounded-md bg-white"
    },
    allTypes.map((t) => /* @__PURE__ */ React12.createElement("option", { key: t, value: t }, t.charAt(0).toUpperCase() + t.slice(1)))
  )));
}

// src/search/SearchResults.jsx
import React13 from "react";
function SearchResults({
  results = [],
  type = "all",
  layout = "grid"
}) {
  if (!results.length) {
    return /* @__PURE__ */ React13.createElement("div", { className: "text-slate-600" }, /* @__PURE__ */ React13.createElement("em", null, "No results"));
  }
  if (layout === "list") {
    return /* @__PURE__ */ React13.createElement("ul", { id: "search-results", className: "space-y-3" }, results.map((r, i) => {
      const hasDims = Number.isFinite(Number(r.thumbnailWidth)) && Number(r.thumbnailWidth) > 0 && Number.isFinite(Number(r.thumbnailHeight)) && Number(r.thumbnailHeight) > 0;
      const aspect = hasDims ? Number(r.thumbnailWidth) / Number(r.thumbnailHeight) : void 0;
      return /* @__PURE__ */ React13.createElement(
        "li",
        {
          key: i,
          className: `search-result ${r.type}`,
          "data-thumbnail-aspect-ratio": aspect
        },
        /* @__PURE__ */ React13.createElement(
          Card,
          {
            href: r.href,
            title: r.title || r.href,
            src: r.type === "work" ? r.thumbnail : void 0,
            imgWidth: r.thumbnailWidth,
            imgHeight: r.thumbnailHeight,
            aspectRatio: aspect
          }
        )
      );
    }));
  }
  return /* @__PURE__ */ React13.createElement("div", { id: "search-results" }, /* @__PURE__ */ React13.createElement(Grid, null, results.map((r, i) => {
    const hasDims = Number.isFinite(Number(r.thumbnailWidth)) && Number(r.thumbnailWidth) > 0 && Number.isFinite(Number(r.thumbnailHeight)) && Number(r.thumbnailHeight) > 0;
    const aspect = hasDims ? Number(r.thumbnailWidth) / Number(r.thumbnailHeight) : void 0;
    return /* @__PURE__ */ React13.createElement(
      GridItem,
      {
        key: i,
        className: `search-result ${r.type}`,
        "data-thumbnail-aspect-ratio": aspect
      },
      /* @__PURE__ */ React13.createElement(
        Card,
        {
          href: r.href,
          title: r.title || r.href,
          src: r.type === "work" ? r.thumbnail : void 0,
          imgWidth: r.thumbnailWidth,
          imgHeight: r.thumbnailHeight,
          aspectRatio: aspect
        }
      )
    );
  })));
}

// src/search/useSearch.js
import { useEffect as useEffect4, useMemo, useRef as useRef2, useState as useState4 } from "react";
function useSearch(query, type) {
  const [records, setRecords] = useState4([]);
  const [loading, setLoading] = useState4(true);
  const indexRef = useRef2(null);
  const idToRecRef = useRef2([]);
  const [types, setTypes] = useState4([]);
  useEffect4(() => {
    let cancelled = false;
    setLoading(true);
    import("flexsearch").then((mod) => {
      const FlexSearch = mod.default || mod;
      return fetch("./search-index.json").then((r) => r.ok ? r.json() : []).catch(() => []).then((data) => {
        if (cancelled) return;
        const idx = new FlexSearch.Index({ tokenize: "forward" });
        const idToRec = [];
        data.forEach((rec, i) => {
          try {
            idx.add(i, rec && rec.title ? String(rec.title) : "");
          } catch (_) {
          }
          idToRec[i] = rec || {};
        });
        const ts = Array.from(
          new Set(data.map((r) => String(r && r.type || "page")))
        );
        const order = ["work", "docs", "page"];
        ts.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
        });
        indexRef.current = idx;
        idToRecRef.current = idToRec;
        setRecords(data);
        setTypes(ts);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const results = useMemo(() => {
    const all = idToRecRef.current;
    if (!all || !all.length) return [];
    const t = String(type || "all").toLowerCase();
    if (!query) {
      return all.filter((r) => t === "all" ? true : String(r.type).toLowerCase() === t);
    }
    let ids = [];
    try {
      ids = indexRef.current && indexRef.current.search(query, { limit: 200 }) || [];
    } catch (_) {
      ids = [];
    }
    const out = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      const rec = all[id];
      if (!rec) continue;
      if (t !== "all" && String(rec.type).toLowerCase() !== t) continue;
      out.push(rec);
    }
    return out;
  }, [query, type, records]);
  return { results, total: records.length || 0, loading, types };
}

// src/search/Search.jsx
import React14 from "react";
function Search(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React14.createElement("div", { "data-canopy-search": "1", className: "not-prose" }, /* @__PURE__ */ React14.createElement(
    "script",
    {
      type: "application/json",
      dangerouslySetInnerHTML: { __html: json }
    }
  ));
}
export {
  Card,
  Fallback,
  Grid,
  GridItem,
  HelloWorld,
  MdxRelatedItems as RelatedItems,
  Search,
  MdxSearchForm as SearchForm,
  SearchForm as SearchFormUI,
  MdxSearchResults as SearchResults,
  SearchResults as SearchResultsUI,
  SearchSummary,
  SearchTotal,
  Slider,
  Viewer,
  useSearch
};
//# sourceMappingURL=index.js.map
