import React, {useEffect, useState} from "react";

// SSR-safe wrapper around Clover's slider. Clover touches the DOM at import time,
// so we dynamically import it only in the browser.
export const Slider = (props) => {
  const [CloverSlider, setCloverSlider] = useState(null);

  useEffect(() => {
    let mounted = true;
    const canUseDom =
      typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/slider")
        .then((mod) => {
          if (!mounted) return;
          console.log(mod);
          const Comp = mod && (mod.default || mod.Slider || mod);
          setCloverSlider(() => Comp);
        })
        .catch(() => {
          // Silently ignore load errors on the server or if Clover is unavailable
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  if (!CloverSlider) {
    // SSR placeholder for client hydration; props provided as JSON
    let json = "{}";
    try {
      json = JSON.stringify(props || {});
    } catch (_) {
      json = "{}";
    }
    return (
      <div className="canopy-slider" data-canopy-slider="1">
        <script
          type="application/json"
          dangerouslySetInnerHTML={{__html: json}}
        />
      </div>
    );
  }
  return <CloverSlider {...props} className="canopy-slider" />;
};
