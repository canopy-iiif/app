import React from 'react';

const SCROLL_OFFSET_REM = 1.618;

function depthIndex(depth) {
  return Math.max(0, Math.min(5, (depth || 1) - 1));
}

export default function ContentNavigation({
  items = [],
  className = '',
  style = {},
  heading,
  headingId,
  pageTitle,
  ariaLabel,
}) {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const savedDepthsRef = React.useRef(null);

  if ((!items || !items.length) && !headingId) return null;

  const combinedClassName = ['canopy-sub-navigation canopy-content-navigation', className]
    .filter(Boolean)
    .join(' ');

  const effectiveHeading = heading || pageTitle || null;
  const navLabel = ariaLabel || (effectiveHeading ? `${effectiveHeading} navigation` : 'Section navigation');

  const getSavedDepth = React.useCallback(
    (id, fallback) => {
      if (!id) return fallback;
      if (!savedDepthsRef.current) savedDepthsRef.current = new Map();
      const store = savedDepthsRef.current;
      if (store.has(id)) return store.get(id);
      store.set(id, fallback);
      return fallback;
    },
    []
  );

  const headingEntries = React.useMemo(() => {
    const entries = [];
    const seen = new Set();
    if (headingId) {
      const topId = String(headingId);
      entries.push({ id: topId, depth: 1 });
      seen.add(topId);
    }
    const pushNodes = (nodes) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node) => {
        if (!node || !node.id) return;
        const id = String(node.id);
        if (seen.has(id)) return;
        seen.add(id);
        const depth = node.depth || node.level || getSavedDepth(id, 2);
        entries.push({ id, depth });
        if (node.children && node.children.length) pushNodes(node.children);
      });
    };
    pushNodes(items);
    return entries;
  }, [headingId, items, getSavedDepth]);

  const fallbackId = headingEntries.length ? headingEntries[0].id : headingId || null;
  const [activeId, setActiveId] = React.useState(fallbackId);
  const activeIdRef = React.useRef(activeId);
  React.useEffect(() => {
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
        ? parseFloat(window.getComputedStyle(root).fontSize || '16') || 16
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
      let nextId = elements[0].id;
      for (const { id, element } of elements) {
        const rect = element.getBoundingClientRect();
        if (rect.top - offset <= 0) {
          nextId = id;
        } else {
          break;
        }
      }
      if (nextId && nextId !== activeIdRef.current) {
        activeIdRef.current = nextId;
        setActiveId(nextId);
      }
    },
    [computeOffsetPx]
  );

  React.useEffect(() => {
    if (!isBrowser) return undefined;
    const elements = headingEntries
      .map((entry) => {
        const element = document.getElementById(entry.id);
        return element ? { id: entry.id, element } : null;
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
          updateActiveFromElements(elements);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle);
      window.removeEventListener('resize', handle);
    };
  }, [headingEntries, isBrowser, updateActiveFromElements]);

  const handleAnchorClick = React.useCallback(
    (event, targetId, options = {}) => {
      try {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
      } catch (_) {}
      if (!isBrowser) return;
      const offset = computeOffsetPx();
      let top = 0;
      if (targetId && targetId !== 'top' && !options.scrollToTop) {
        const el = document.getElementById(targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          top = window.scrollY + rect.top - offset;
        }
      }
      if (!Number.isFinite(top) || top < 0 || options.scrollToTop) top = 0;
      const nextId = targetId && targetId !== 'top'
        ? targetId
        : headingEntries[0]?.id || headingId || null;
      if (nextId) {
        activeIdRef.current = nextId;
        setActiveId(nextId);
      }
      try {
        window.scrollTo({ top, behavior: 'smooth' });
      } catch (_) {
        window.scrollTo(0, top);
      }
    },
    [computeOffsetPx, headingEntries, headingId, isBrowser]
  );

  const renderNodes = React.useCallback(
    (nodes) => {
      if (!nodes || !nodes.length) return null;
      return nodes.map((node) => {
        if (!node) return null;
        const id = node.id ? String(node.id) : '';
        const depth = node.depth || node.level || getSavedDepth(id, 2);
        const idx = depthIndex(depth);
        const isActive = id && activeId === id;
        return (
          <li key={id || node.title} className="canopy-sub-navigation__item" data-depth={idx}>
            <a
              className={`canopy-sub-navigation__link depth-${idx}${isActive ? ' is-active' : ''}`}
              href={id ? `#${id}` : '#'}
              onClick={(event) => handleAnchorClick(event, id || null)}
              aria-current={isActive ? 'location' : undefined}
            >
              {node.title}
            </a>
            {node.children && node.children.length ? (
              <ul
                className="canopy-sub-navigation__list canopy-sub-navigation__list--nested"
                role="list"
              >
                {renderNodes(node.children)}
              </ul>
            ) : null}
          </li>
        );
      });
    },
    [handleAnchorClick, activeId, getSavedDepth]
  );

  const nestedItems = renderNodes(items);
  const topLink = headingId
    ? (
        <li className="canopy-sub-navigation__item" data-depth={0}>
          <a
            className={`canopy-sub-navigation__link depth-0${activeId === headingId ? ' is-active' : ''}`}
            href={`#${headingId}`}
            onClick={(event) => handleAnchorClick(event, headingId, { scrollToTop: true })}
            aria-current={activeId === headingId ? 'location' : undefined}
          >
            {effectiveHeading || pageTitle || headingId}
          </a>
          {nestedItems ? (
            <ul
              className="canopy-sub-navigation__list canopy-sub-navigation__list--nested"
              role="list"
            >
              {nestedItems}
            </ul>
          ) : null}
        </li>
      )
    : null;

  return (
    <nav className={combinedClassName} style={style} aria-label={navLabel}>
      <ul className="canopy-sub-navigation__list" role="list">
        {topLink || nestedItems}
      </ul>
    </nav>
  );
}
