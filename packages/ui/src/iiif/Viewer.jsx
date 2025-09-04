import React, { useEffect, useState } from "react";

// SSR-safe wrapper around Clover's viewer. Clover touches the DOM at import time,
// so we dynamically import it only in the browser.
export const Viewer = (props) => {
  const [CloverViewer, setCloverViewer] = useState(null);

  useEffect(() => {
    let mounted = true;
    const canUseDom =
      typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/viewer")
        .then((mod) => {
          if (!mounted) return;
          console.log(mod);
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
    let json = '{}';
    try {
      json = JSON.stringify(props || {});
    } catch (_) {
      json = '{}';
    }
    return (
      <div data-canopy-viewer="1">
        <script type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
      </div>
    );
  }
  return <CloverViewer {...props} />;
};
