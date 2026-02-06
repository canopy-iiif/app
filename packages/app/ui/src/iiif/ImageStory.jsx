import React, {useEffect, useMemo, useRef} from "react";
import {
  mountImageStory,
  sanitizeImageStoryProps,
  serializeImageStoryProps,
} from "./imageStoryRuntime.js";

export const ImageStory = (props = {}) => {
  const {
    iiifContent,
    disablePanAndZoom,
    pointOfInterestSvgUrl,
    viewerOptions,
    height = 600,
    className,
    style,
    ...rest
  } = props || {};
  const containerRef = useRef(null);
  const resolvedClassName = useMemo(() => {
    return ["canopy-image-story", className].filter(Boolean).join(" ");
  }, [className]);
  const serializedProps = useMemo(() => {
    return serializeImageStoryProps({
      iiifContent,
      disablePanAndZoom,
      pointOfInterestSvgUrl,
      viewerOptions,
    });
  }, [iiifContent, disablePanAndZoom, pointOfInterestSvgUrl, viewerOptions]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    let cleanup = null;
    let cancelled = false;
    const payload = sanitizeImageStoryProps({
      iiifContent,
      disablePanAndZoom,
      pointOfInterestSvgUrl,
      viewerOptions,
    });
    mountImageStory(node, payload).then((destroy) => {
      if (cancelled) {
        destroy && destroy();
        return;
      }
      cleanup = typeof destroy === "function" ? destroy : null;
    });
    return () => {
      cancelled = true;
      if (cleanup) {
        try {
          cleanup();
        } catch (_) {}
        cleanup = null;
      }
    };
  }, [iiifContent, disablePanAndZoom, pointOfInterestSvgUrl, viewerOptions]);

  return (
    <div
      ref={containerRef}
      className={resolvedClassName}
      data-canopy-image-story="1"
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        ...(style || {}),
      }}
      {...rest}
    >
      <script type="application/json" dangerouslySetInnerHTML={{__html: serializedProps}} />
    </div>
  );
};
