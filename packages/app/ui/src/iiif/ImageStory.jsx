import React, {useEffect, useMemo, useRef} from "react";
import {
  mountImageStory,
  sanitizeImageStoryProps,
  serializeImageStoryProps,
} from "./imageStoryRuntime.js";

const DEFAULT_IMAGE_STORY_HEIGHT = 600;
const NUMERIC_HEIGHT_PATTERN = /^[+-]?(?:\d+|\d*\.\d+)$/;

function resolveContainerHeight(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return `${DEFAULT_IMAGE_STORY_HEIGHT}px`;
    }
    if (NUMERIC_HEIGHT_PATTERN.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  }
  return `${DEFAULT_IMAGE_STORY_HEIGHT}px`;
}

export const ImageStory = (props = {}) => {
  const {
    iiifContent,
    disablePanAndZoom,
    pointOfInterestSvgUrl,
    viewerOptions,
    height = DEFAULT_IMAGE_STORY_HEIGHT,
    className,
    style,
    ...rest
  } = props || {};
  const containerRef = useRef(null);
  const resolvedClassName = useMemo(() => {
    return ["canopy-image-story", className].filter(Boolean).join(" ");
  }, [className]);
  const resolvedHeight = useMemo(() => {
    return resolveContainerHeight(height);
  }, [height]);
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
        height: resolvedHeight,
        ...(style || {}),
      }}
      {...rest}
    >
      <script type="application/json" dangerouslySetInnerHTML={{__html: serializedProps}} />
    </div>
  );
};
