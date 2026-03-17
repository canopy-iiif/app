import React, {useEffect, useMemo, useRef} from "react";
import {
  mountImageStory,
  sanitizeImageStoryProps,
  serializeImageStoryProps,
} from "./imageStoryRuntime.js";

const DEFAULT_IMAGE_STORY_HEIGHT = 600;
const NUMERIC_HEIGHT_PATTERN = /^[+-]?(?:\d+|\d*\.\d+)$/;
const SIZE_EPSILON = 1;

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
    let lastKnownSize = null;

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

    const measureSize = () => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const width = rect?.width || node.offsetWidth || node.clientWidth || 0;
      const height = rect?.height || node.offsetHeight || node.clientHeight || 0;
      return {width, height};
    };

    const hasUsableSize = () => {
      const size = measureSize();
      if (!size) return false;
      const usable = size.width > 2 && size.height > 2;
      if (usable) {
        lastKnownSize = size;
      }
      return usable;
    };

    const hasMeaningfulSizeChange = () => {
      const size = measureSize();
      if (!size) return false;
      if (size.width <= 2 || size.height <= 2) {
        return true;
      }
      if (!lastKnownSize) {
        lastKnownSize = size;
        return true;
      }
      const widthDelta = Math.abs(size.width - lastKnownSize.width);
      const heightDelta = Math.abs(size.height - lastKnownSize.height);
      if (widthDelta > SIZE_EPSILON || heightDelta > SIZE_EPSILON) {
        lastKnownSize = size;
        return true;
      }
      return false;
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

    const scheduleWatchers = () => {
      if (mounted || cancelled) return;
      if (
        !resizeObserver &&
        typeof window !== "undefined" &&
        typeof window.ResizeObserver === "function"
      ) {
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
      if (!pollId) {
        schedulePoll();
      }
    };

    const beginMounting = () => {
      if (!mountViewer()) {
        scheduleWatchers();
      }
    };

    const remountViewer = () => {
      if (cancelled) return;
      if (mounted) {
        mounted = false;
        destroyCleanup();
      }
      beginMounting();
    };

    beginMounting();

    const handleGalleryModalChange = (event) => {
      if (!node || !event || typeof document === "undefined") return;
      const detail = event.detail || {};
      if (detail.state !== "open") return;
      const modal =
        detail.modal || (detail.modalId ? document.getElementById(detail.modalId) : null);
      if (!modal || !modal.contains(node)) return;
      if (!mounted) return;
      if (hasMeaningfulSizeChange()) {
        remountViewer();
      }
    };

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("canopy:gallery:modal-change", handleGalleryModalChange);
    }

    return () => {
      cancelled = true;
      disconnectWatchers();
      destroyCleanup();
      if (typeof window !== "undefined" && window.removeEventListener) {
        window.removeEventListener(
          "canopy:gallery:modal-change",
          handleGalleryModalChange,
        );
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
      <script
        type="application/json"
        dangerouslySetInnerHTML={{__html: serializedProps}}
      />
    </div>
  );
};
