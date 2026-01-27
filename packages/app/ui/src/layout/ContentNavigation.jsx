import React from "react";
import NavigationTree from "./NavigationTree.jsx";

const SCROLL_OFFSET_REM = 1.618;
const MAX_HEADING_DEPTH = 3;

function depthIndex(depth) {
  return Math.max(0, Math.min(5, (depth || 1) - 1));
}

function resolveDepth(value, fallback = 1) {
  return Math.max(1, typeof value === "number" ? value : fallback);
}

function buildNodeKey(id, parentKey, index) {
  const base = id ? String(id) : `section-${parentKey || "root"}-${index}`;
  const sanitized = base.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${parentKey || "section"}-${sanitized || index}`;
}

export default function ContentNavigation({
  items = [],
  className = "",
  style = {},
  heading,
  headingId,
  pageTitle,
  ariaLabel,
}) {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";
  const savedDepthsRef = React.useRef(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleToggle = React.useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if ((!items || !items.length) && !headingId) return null;

  const combinedClassName = [
    "canopy-sub-navigation canopy-content-navigation",
    isExpanded
      ? "canopy-content-navigation--expanded"
      : "canopy-content-navigation--collapsed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const effectiveHeading = heading || pageTitle || null;
  const navLabel =
    ariaLabel ||
    (effectiveHeading
      ? `${effectiveHeading} navigation`
      : "Section navigation");
  const toggleSrLabel = isExpanded
    ? "Hide section navigation"
    : "Show section navigation";
  const toggleStateClass = isExpanded ? "is-expanded" : "is-collapsed";

  const getSavedDepth = React.useCallback((id, fallback) => {
    if (!id) return fallback;
    if (!savedDepthsRef.current) savedDepthsRef.current = new Map();
    const store = savedDepthsRef.current;
    if (store.has(id)) return store.get(id);
    store.set(id, fallback);
    return fallback;
  }, []);

  const headingEntries = React.useMemo(() => {
    const entries = [];
    const seen = new Set();
    if (headingId) {
      const topId = String(headingId);
      entries.push({id: topId, depth: 1});
      seen.add(topId);
    }
    const pushNodes = (nodes) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node) => {
        if (!node || !node.id) return;
        const id = String(node.id);
        if (seen.has(id)) return;
        seen.add(id);
        const depth = resolveDepth(
          typeof node.depth === "number" ? node.depth : node.level,
          getSavedDepth(id, 2),
        );
        if (depth > MAX_HEADING_DEPTH) return;
        entries.push({id, depth});
        if (node.children && node.children.length) pushNodes(node.children);
      });
    };
    pushNodes(items);
    return entries;
  }, [headingId, items, getSavedDepth]);

  const fallbackId = headingEntries.length
    ? headingEntries[0].id
    : headingId || null;
  const [activeId, setActiveId] = React.useState(fallbackId);
  const activeIdRef = React.useRef(activeId);
  React.useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      activeIdRef.current !== activeId
    ) {
      console.log("[ContentNavigation] activeId changed:", activeId);
    }
    activeIdRef.current = activeId;
  }, [activeId]);

  React.useEffect(() => {
    if (!headingEntries.length) return;
    if (!headingEntries.some((entry) => entry.id === activeIdRef.current)) {
      const next = headingEntries[0].id;
      activeIdRef.current = next;
      setActiveId(next);
    }
  }, [headingEntries]);

  const computeOffsetPx = React.useCallback(() => {
    if (!isBrowser) return 0;
    try {
      const root = document.documentElement;
      const fontSize = root
        ? parseFloat(window.getComputedStyle(root).fontSize || "16") || 16
        : 16;
      return fontSize * SCROLL_OFFSET_REM;
    } catch (_) {
      return 0;
    }
  }, [isBrowser]);

  const headingElementsRef = React.useRef([]);

  const updateActiveFromElements = React.useCallback(
    (elements) => {
      if (!elements || !elements.length) return;
      const offset = computeOffsetPx();
      const viewportLimit =
        typeof window !== "undefined" && window.innerHeight
          ? window.innerHeight * 0.5
          : 0;
      let fallbackId = elements[0].id;
      let bestId = fallbackId;
      let bestDistance = Number.POSITIVE_INFINITY;
      elements.forEach(({id, element}) => {
        if (!element || !id) return;
        const rect = element.getBoundingClientRect();
        const relativeTop = rect.top - offset;
        if (viewportLimit > 0 && relativeTop < -viewportLimit) {
          return;
        }
        const distance = Math.abs(relativeTop);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = id;
        }
      });
      const nextId = bestId || fallbackId;
      if (nextId && nextId !== activeIdRef.current) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[ContentNavigation] updateActive ->", nextId);
        }
        activeIdRef.current = nextId;
        setActiveId(nextId);
      }
    },
    [computeOffsetPx],
  );

  React.useEffect(() => {
    if (!isBrowser) return undefined;
    const elements = headingEntries
      .map((entry) => {
        const element = document.getElementById(entry.id);
        return element ? {id: entry.id, element} : null;
      })
      .filter(Boolean);
    headingElementsRef.current = elements;
    updateActiveFromElements(elements);
    if (!elements.length) return undefined;

    let ticking = false;
    const handle = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "[ContentNavigation] scroll event",
              window.scrollY,
              window.innerHeight,
            );
          }
          updateActiveFromElements(elements);
          ticking = false;
        });
      }
    };
    window.addEventListener("scroll", handle, {passive: true});
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [headingEntries, isBrowser, updateActiveFromElements]);

  const handleAnchorClick = React.useCallback(
    (event, targetId, options = {}) => {
      try {
        if (event && typeof event.preventDefault === "function")
          event.preventDefault();
      } catch (_) {}
      if (!isBrowser) return;
      const offset = computeOffsetPx();
      let top = 0;
      if (targetId && targetId !== "top" && !options.scrollToTop) {
        const el = document.getElementById(targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          top = window.scrollY + rect.top - offset;
        }
      }
      if (!Number.isFinite(top) || top < 0 || options.scrollToTop) top = 0;
      const nextId =
        targetId && targetId !== "top"
          ? targetId
          : headingEntries[0]?.id || headingId || null;
      if (nextId) {
        activeIdRef.current = nextId;
        setActiveId(nextId);
      }
      try {
        window.scrollTo({top, behavior: "smooth"});
      } catch (_) {
        window.scrollTo(0, top);
      }
    },
    [computeOffsetPx, headingEntries, headingId, isBrowser],
  );

  const navTreeRoot = React.useMemo(() => {
    function mapNodes(nodes, parentKey = "section") {
      if (!Array.isArray(nodes) || !nodes.length) return [];
      return nodes
        .map((node, index) => {
          if (!node) return null;
          const id = node.id ? String(node.id) : "";
          const depth = resolveDepth(
            typeof node.depth === "number" ? node.depth : node.level,
            getSavedDepth(id, 2),
          );
          if (depth > MAX_HEADING_DEPTH) return null;
          const key = buildNodeKey(
            id || node.title || `section-${index}`,
            parentKey,
            index,
          );
          const href = id ? `#${id}` : "#";
          const childNodes = mapNodes(node.children || [], key);
          const isActive = id && activeId === id;
          const hasActiveChild = childNodes.some(
            (child) => child && child.isActive,
          );
          return {
            slug: key,
            title: node.title || node.text || id || `Section ${index + 1}`,
            href,
            children: childNodes,
            isActive: Boolean(isActive),
            isExpanded: isActive || hasActiveChild,
          };
        })
        .filter(Boolean);
    }

    const nodes = mapNodes(items, "section");
    return {
      slug: "content-nav-root",
      title: effectiveHeading || pageTitle || "On this page",
      children: nodes,
    };
  }, [items, effectiveHeading, pageTitle, activeId, getSavedDepth]);

  return (
    <nav
      className={combinedClassName}
      style={style}
      aria-label={navLabel}
      data-canopy-content-nav="true"
    >
      <button
        type="button"
        className={`canopy-content-navigation__toggle ${toggleStateClass}`}
        aria-expanded={isExpanded}
        aria-label={toggleSrLabel}
        title={toggleSrLabel}
        onClick={handleToggle}
        data-canopy-content-nav-toggle="true"
        data-show-label="Show"
        data-hide-label="Hide"
        data-show-full-label="Show content navigation"
        data-hide-full-label="Hide content navigation"
      >
        <span
          className="canopy-content-navigation__toggle-icon"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="ionicon"
            viewBox="0 0 512 512"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="50"
              d="M160 144h288M160 256h288M160 368h288"
            />
            <circle
              cx="80"
              cy="144"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <circle
              cx="80"
              cy="256"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <circle
              cx="80"
              cy="368"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
          </svg>
        </span>
        <span
          className="canopy-content-navigation__toggle-label"
          data-canopy-content-nav-toggle-label="true"
        >
          <span className="sr-only">{toggleSrLabel}</span>
        </span>
        <span className="sr-only" data-canopy-content-nav-toggle-sr="true">
          {toggleSrLabel}
        </span>
      </button>
      <NavigationTree
        root={navTreeRoot}
        includeRoot={false}
        parentKey="content-nav"
        className="canopy-sub-navigation__tree canopy-content-navigation__tree"
      />
    </nav>
  );
}
