import React, { useEffect, useState } from "react";

// SSR-safe wrapper around Clover's scroll component. The library touches the DOM
// during import, so we only load it in the browser and render a placeholder on the
// server for the hydration runtime to mount.
export const Scroll = (props) => {
  const [CloverScroll, setCloverScroll] = useState(null);

  useEffect(() => {
    let mounted = true;
    const canUseDom =
      typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/scroll")
        .then((mod) => {
          if (!mounted) return;
          const Comp = mod && (mod.default || mod.Scroll || mod);
          setCloverScroll(() => Comp);
        })
        .catch(() => {
          // Silently ignore load errors during SSR or when Clover is unavailable.
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  if (!CloverScroll) {
    // SSR placeholder for client hydration; props provided as JSON
    let json = "{}";
    try {
      json = JSON.stringify(props || {});
    } catch (_) {
      json = "{}";
    }
    return (
      <div data-canopy-scroll="1" className="not-prose">
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      </div>
    );
  }

  return <CloverScroll {...props} />;
};
