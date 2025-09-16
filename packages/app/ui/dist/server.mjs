// ui/src/Fallback.jsx
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

// ui/src/HelloWorld.jsx
import React2 from "react";
var HelloWorld = () => {
  return /* @__PURE__ */ React2.createElement("div", null, "Hello, World!");
};

// ui/src/iiif/Viewer.jsx
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

// ui/src/iiif/Slider.jsx
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

// ui/src/iiif/MdxRelatedItems.jsx
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

// ui/src/search/MdxSearchForm.jsx
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

// ui/src/search/MdxSearchResults.jsx
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

// ui/src/search/SearchSummary.jsx
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

// ui/src/search/SearchTotal.jsx
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

// ui/src/command/MdxCommandPalette.jsx
import React10 from "react";
function MdxCommandPalette(props = {}) {
  const {
    placeholder = "Search\u2026",
    hotkey = "mod+k",
    maxResults = 8,
    groupOrder = ["work", "page"],
    button = true,
    buttonLabel = "Search"
  } = props || {};
  const data = { placeholder, hotkey, maxResults, groupOrder };
  return /* @__PURE__ */ React10.createElement("div", { "data-canopy-command": true }, button && /* @__PURE__ */ React10.createElement(
    "button",
    {
      type: "button",
      "data-canopy-command-trigger": true,
      className: "inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50",
      "aria-label": "Open search"
    },
    /* @__PURE__ */ React10.createElement("span", { "aria-hidden": true }, "\u2318K"),
    /* @__PURE__ */ React10.createElement("span", { className: "sr-only" }, buttonLabel)
  ), /* @__PURE__ */ React10.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: JSON.stringify(data) } }));
}

// ui/src/command/CommandApp.jsx
import React11, { useEffect as useEffect3, useMemo, useState as useState3 } from "react";
import { Command } from "cmdk";
function normalize(s) {
  try {
    return String(s || "").toLowerCase();
  } catch (e) {
    return "";
  }
}
function groupLabel(t) {
  const type = String(t || "").toLowerCase();
  if (type === "work") return "Works";
  if (type === "page") return "Pages";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
function CommandPaletteApp(props) {
  const {
    records = [],
    loading = false,
    open: controlledOpen,
    onOpenChange,
    onSelect = () => {
    },
    config = {}
  } = props || {};
  const {
    placeholder = "Search\u2026",
    hotkey = "mod+k",
    maxResults = 8,
    groupOrder = ["work", "page"],
    button = true,
    buttonLabel = "Search"
  } = config || {};
  const [open, setOpen] = useState3(!!controlledOpen);
  useEffect3(() => {
    if (typeof controlledOpen === "boolean") setOpen(controlledOpen);
  }, [controlledOpen]);
  const setOpenBoth = (v) => {
    setOpen(!!v);
    if (onOpenChange) onOpenChange(!!v);
  };
  const [q, setQ] = useState3("");
  useEffect3(() => {
    function handler(e) {
      try {
        const hk = String(hotkey || "mod+k").toLowerCase();
        const isMod = hk.includes("mod+");
        const key = hk.split("+").pop();
        if ((isMod ? e.metaKey || e.ctrlKey : true) && e.key.toLowerCase() === String(key || "k")) {
          e.preventDefault();
          setOpenBoth(true);
        }
      } catch (e2) {
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [hotkey]);
  useEffect3(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpenBoth(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const results = useMemo(() => {
    if (!q) return [];
    const qq = normalize(q);
    const out = [];
    for (const r of records || []) {
      const title = String(r && r.title || "");
      if (!title) continue;
      if (normalize(title).includes(qq)) out.push(r);
      if (out.length >= Math.max(1, Number(maxResults) || 8)) break;
    }
    return out;
  }, [q, records, maxResults]);
  const grouped = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const r of results) {
      const t = String(r && r.type || "page");
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(r);
    }
    return map;
  }, [results]);
  const onOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) setOpenBoth(false);
  };
  const onItemSelect = (href) => {
    try {
      onSelect(String(href || ""));
      setOpenBoth(false);
    } catch (e) {
    }
  };
  return /* @__PURE__ */ React11.createElement("div", { className: "canopy-cmdk" }, button && /* @__PURE__ */ React11.createElement(
    "button",
    {
      type: "button",
      className: "canopy-cmdk__trigger",
      onClick: () => setOpenBoth(true),
      "aria-label": "Open search",
      "data-canopy-command-trigger": true
    },
    /* @__PURE__ */ React11.createElement("span", { "aria-hidden": true }, "\u2318K"),
    /* @__PURE__ */ React11.createElement("span", { className: "sr-only" }, buttonLabel)
  ), /* @__PURE__ */ React11.createElement(
    "div",
    {
      className: "canopy-cmdk__overlay",
      "data-open": open ? "1" : "0",
      onMouseDown: onOverlayMouseDown,
      style: { display: open ? "flex" : "none" }
    },
    /* @__PURE__ */ React11.createElement("div", { className: "canopy-cmdk__panel" }, /* @__PURE__ */ React11.createElement("button", { className: "canopy-cmdk__close", "aria-label": "Close", onClick: () => setOpenBoth(false) }, "\xD7"), /* @__PURE__ */ React11.createElement("div", { className: "canopy-cmdk__inputWrap" }, /* @__PURE__ */ React11.createElement(Command, null, /* @__PURE__ */ React11.createElement(Command.Input, { autoFocus: true, value: q, onValueChange: setQ, placeholder, className: "canopy-cmdk__input" }), /* @__PURE__ */ React11.createElement(Command.List, { className: "canopy-cmdk__list" }, loading && /* @__PURE__ */ React11.createElement(Command.Loading, null, "Hang on\u2026"), /* @__PURE__ */ React11.createElement(Command.Empty, null, "No results found."), (Array.isArray(groupOrder) ? groupOrder : []).map((t) => grouped.has(t) ? /* @__PURE__ */ React11.createElement(Command.Group, { key: t, heading: groupLabel(t) }, grouped.get(t).map((r, i) => /* @__PURE__ */ React11.createElement(Command.Item, { key: t + "-" + i, onSelect: () => onItemSelect(r.href) }, /* @__PURE__ */ React11.createElement("div", { className: "canopy-cmdk__item" }, String(r.type || "") === "work" && r.thumbnail ? /* @__PURE__ */ React11.createElement("img", { className: "canopy-cmdk__thumb", src: r.thumbnail, alt: "" }) : null, /* @__PURE__ */ React11.createElement("span", { className: "canopy-cmdk__title" }, r.title))))) : null), Array.from(grouped.keys()).filter((t) => !(groupOrder || []).includes(t)).map((t) => /* @__PURE__ */ React11.createElement(Command.Group, { key: t, heading: groupLabel(t) }, grouped.get(t).map((r, i) => /* @__PURE__ */ React11.createElement(Command.Item, { key: t + "-x-" + i, onSelect: () => onItemSelect(r.href) }, /* @__PURE__ */ React11.createElement("div", { className: "canopy-cmdk__item" }, String(r.type || "") === "work" && r.thumbnail ? /* @__PURE__ */ React11.createElement("img", { className: "canopy-cmdk__thumb", src: r.thumbnail, alt: "" }) : null, /* @__PURE__ */ React11.createElement("span", { className: "canopy-cmdk__title" }, r.title))))))))))
  ));
}
export {
  MdxCommandPalette as CommandPalette,
  CommandPaletteApp,
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
//# sourceMappingURL=server.mjs.map
