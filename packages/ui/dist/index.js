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
import React3 from "react";
function Card({
  href,
  src,
  alt,
  title,
  subtitle,
  className,
  style,
  children,
  ...rest
}) {
  const caption = /* @__PURE__ */ React3.createElement("figcaption", { style: { marginTop: 8 } }, title ? /* @__PURE__ */ React3.createElement("strong", { style: { display: "block" } }, title) : null, subtitle ? /* @__PURE__ */ React3.createElement("span", { style: { display: "block", color: "#6b7280" } }, subtitle) : null, children);
  return /* @__PURE__ */ React3.createElement("a", { href, className, style, ...rest }, /* @__PURE__ */ React3.createElement("figure", { style: { margin: 0 } }, src ? /* @__PURE__ */ React3.createElement(
    "img",
    {
      src,
      alt: alt || title || "",
      loading: "lazy",
      style: {
        display: "block",
        width: "100%",
        height: "auto",
        borderRadius: 4
      }
    }
  ) : null, caption));
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
    default: 4,
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
import React5, { useEffect, useState } from "react";
var Viewer = (props) => {
  const [CloverViewer, setCloverViewer] = useState(null);
  const options = {
    informationPanel: {
      open: false,
      renderAbout: false
    }
  };
  useEffect(() => {
    let mounted = true;
    const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/viewer").then((mod) => {
        if (!mounted) return;
        console.log(mod);
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
      json = JSON.stringify(props || {});
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
  return /* @__PURE__ */ React5.createElement(CloverViewer, { ...props, options });
};

// src/iiif/Slider.jsx
import React6, { useEffect as useEffect2, useState as useState2 } from "react";
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

// src/iiif/MdxFacetSliders.jsx
import React7 from "react";
function MdxFacetSliders(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React7.createElement("div", { "data-canopy-facet-sliders": "1", className: "not-prose" }, /* @__PURE__ */ React7.createElement(
    "script",
    {
      type: "application/json",
      dangerouslySetInnerHTML: { __html: json }
    }
  ));
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
    return /* @__PURE__ */ React13.createElement("ul", { id: "search-results", className: "space-y-3" }, results.map((r, i) => /* @__PURE__ */ React13.createElement("li", { key: i, className: `search-result ${r.type}` }, /* @__PURE__ */ React13.createElement(
      Card,
      {
        href: r.href,
        title: r.title || r.href,
        src: r.type === "work" ? r.thumbnail : void 0
      }
    ))));
  }
  return /* @__PURE__ */ React13.createElement("div", { id: "search-results", className: "not-prose" }, /* @__PURE__ */ React13.createElement(Grid, null, results.map((r, i) => /* @__PURE__ */ React13.createElement(GridItem, { key: i, className: `search-result ${r.type}` }, /* @__PURE__ */ React13.createElement(
    Card,
    {
      href: r.href,
      title: r.title || r.href,
      src: r.type === "work" ? r.thumbnail : void 0
    }
  )))));
}

// src/search/useSearch.js
import { useEffect as useEffect3, useMemo, useRef, useState as useState3 } from "react";
function useSearch(query, type) {
  const [records, setRecords] = useState3([]);
  const [loading, setLoading] = useState3(true);
  const indexRef = useRef(null);
  const idToRecRef = useRef([]);
  const [types, setTypes] = useState3([]);
  useEffect3(() => {
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
  MdxFacetSliders as FacetSliders,
  Fallback,
  Grid,
  GridItem,
  HelloWorld,
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
