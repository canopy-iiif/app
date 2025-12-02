import React, {useEffect, useState} from "react";

// SSR-safe wrapper around Clover's image component. The module relies on the DOM
// during import, so we lazy-load it in the browser and render a placeholder on the
// server for the hydration runtime.
export const Image = (props = {}) => {
  const [CloverImage, setCloverImage] = useState(null);
  const baseClass = "canopy-iiif-image";
  const {
    height = `600px`,
    backgroundColor = `var(--color-gray-200)`,
    caption,
    className: userClassName,
  } = props || {};
  const rootClassName = [userClassName, baseClass].filter(Boolean).join(" ");

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

    return (
      <figure className={rootClassName}>
        <div
          className={`${baseClass}__placeholder`}
          data-canopy-image="1"
          style={{
            "--canopy-iiif-image-height": height,
            "--canopy-iiif-image-bg": backgroundColor,
          }}
        >
          <script
            type="application/json"
            dangerouslySetInnerHTML={{__html: json}}
          />
        </div>
        {caption && (
          <figcaption className={`${baseClass}__caption`}>
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return <CloverImage {...props} className={rootClassName} />;
};
