import React, { useEffect, useState } from "react";

// SSR-safe wrapper around Clover's viewer. Clover touches the DOM at import time,
// so we dynamically import it only in the browser.

// Default Clover viewer options; can be overridden per-usage via props.options
const DEFAULT_VIEWER_OPTIONS = {
  showDownload: false,
  showIIIFBadge: false,
  showTitle: false,
  informationPanel: {
    open: false,
    renderAbout: false,
    renderToggle: false,
  },
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

export const Viewer = (props) => {
  const [CloverViewer, setCloverViewer] = useState(null);
  const mergedOptions = deepMerge(
    DEFAULT_VIEWER_OPTIONS,
    props && props.options
  );

  useEffect(() => {
    let mounted = true;
    const canUseDom =
      typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/viewer")
        .then((mod) => {
          if (!mounted) return;
          // Loaded Clover viewer dynamically in the browser
          const Comp = mod && (mod.default || mod.Viewer || mod);
          setCloverViewer(() => Comp);
        })
        .catch(() => {
          // Silently ignore load errors on the server or if Clover is unavailable
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  if (!CloverViewer) {
    // SSR placeholder for client hydration; props provided as JSON
    let json = "{}";
    try {
      const p = { ...(props || {}) };
      if (mergedOptions) p.options = mergedOptions;
      json = JSON.stringify(p);
    } catch (_) {
      json = "{}";
    }
    return (
      <div data-canopy-viewer="1" className="not-prose">
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      </div>
    );
  }
  return <CloverViewer {...props} options={mergedOptions} />;
};
