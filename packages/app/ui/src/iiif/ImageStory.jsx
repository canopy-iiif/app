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
    let mounted = false;
    let resizeObserver = null;
    let pollId = null;

    const payload = sanitizeImageStoryProps({
      iiifContent,
      disablePanAndZoom,
      pointOfInterestSvgUrl,
      viewerOptions,
    });

    const destroyCleanup = () => {
      if (cleanup) {
        try {
          cleanup();
        } catch (_) {}
        cleanup = null;
      }
    };

    const disconnectWatchers = () => {
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (_) {}
        resizeObserver = null;
      }
      if (pollId) {
        window.clearTimeout(pollId);
        pollId = null;
      }
    };

    const hasUsableSize = () => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const width = rect?.width || node.offsetWidth || node.clientWidth;
      const height = rect?.height || node.offsetHeight || node.clientHeight;
      return width > 2 && height > 2;
    };

    const mountViewer = () => {
      if (!node || mounted || cancelled) return false;
      if (!hasUsableSize()) return false;
      mounted = true;
      disconnectWatchers();
      mountImageStory(node, payload).then((destroy) => {
        if (cancelled) {
          destroy && destroy();
          return;
        }
        cleanup = typeof destroy === "function" ? destroy : null;
      });
      return true;
    };

    if (!mountViewer()) {
      if (typeof window !== "undefined" && typeof window.ResizeObserver === "function") {
        resizeObserver = new window.ResizeObserver(() => {
          if (mounted || cancelled) return;
          mountViewer();
        });
        try {
          resizeObserver.observe(node);
        } catch (_) {}
      }
      const schedulePoll = () => {
        if (mounted || cancelled) return;
        pollId = window.setTimeout(() => {
          pollId = null;
          if (!mountViewer()) {
            schedulePoll();
          }
        }, 200);
      };
      schedulePoll();
    }

    return () => {
      cancelled = true;
      disconnectWatchers();
      destroyCleanup();
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
      <script
        type="application/json"
        dangerouslySetInnerHTML={{__html: serializedProps}}
      />
    </div>
  );
};
