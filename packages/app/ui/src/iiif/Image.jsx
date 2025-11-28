import React, {useEffect, useState} from "react";

// SSR-safe wrapper around Clover's image component. The module relies on the DOM
// during import, so we lazy-load it in the browser and render a placeholder on the
// server for the hydration runtime.
export const Image = (props) => {
  const [CloverImage, setCloverImage] = useState(null);

  useEffect(() => {
    let mounted = true;
    const canUseDom =
      typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/image")
        .then((mod) => {
          if (!mounted) return;
          const Comp = mod && (mod.default || mod.Image || mod);
          setCloverImage(() => Comp);
        })
        .catch(() => {
          // Suppress errors during SSR or when the Clover bundle is unavailable.
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  if (!CloverImage) {
    let json = "{}";
    try {
      json = JSON.stringify(props || {});
    } catch (_) {
      json = "{}";
    }

    const {
      height = `600px`,
      backgroundColor = `var(--color-gray-200)`,
      caption,
    } = props || {};

    return (
      <figure
        style={{
          margin: `1.618rem 0 2.618rem`,
        }}
      >
        <div
          data-canopy-image="1"
          style={{
            height,
            backgroundColor,
            borderRadius: `0.25rem`,
          }}
        >
          <script
            type="application/json"
            dangerouslySetInnerHTML={{__html: json}}
          />
        </div>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    );
  }

  return <CloverImage {...props} />;
};
