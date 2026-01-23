import React from "react";
import navigationHelpers from "../../../lib/components/navigation.js";
import SubNavigation from "./SubNavigation.jsx";
import ContentNavigation from "./ContentNavigation.jsx";

function buildHeadingTree(headings) {
  if (!Array.isArray(headings) || !headings.length) return [];
  const root = [];
  const stack = [];
  headings.forEach((heading) => {
    if (!heading || typeof heading !== "object") return;
    const depth =
      typeof heading.depth === "number" ? heading.depth : heading.level;
    if (typeof depth !== "number" || depth < 2) return;
    const entry = {
      id: heading.id || heading.slug || heading.title,
      title: heading.title || heading.text || heading.id,
      depth,
      children: [],
    };
    while (stack.length && stack[stack.length - 1].depth >= entry.depth) {
      stack.pop();
    }
    if (!stack.length) {
      root.push(entry);
    } else {
      stack[stack.length - 1].children.push(entry);
    }
    stack.push(entry);
  });
  return root;
}

function buildNavigationAside(sidebar, className) {
  if (!sidebar) {
    return <SubNavigation className={className} />;
  }
  if (typeof sidebar === "function") {
    return React.createElement(sidebar);
  }
  return sidebar;
}

function ContentNavigationScript() {
  const code = `
(function () {
  if (typeof window === 'undefined') return;
  if (window.__CANOPY_CONTENT_NAV_READY__) return;
  window.__CANOPY_CONTENT_NAV_READY__ = true;
  var STORAGE_KEY = 'canopy_content_nav_collapsed';
  var storage = null;
  try {
    storage = window.localStorage;
  } catch (error) {
    storage = null;
  }

  function setStored(value) {
    if (!storage) return;
    try {
      if (value == null) {
        storage.removeItem(STORAGE_KEY);
      } else {
        storage.setItem(STORAGE_KEY, value);
      }
    } catch (error) {}
  }

  function getStored() {
    if (!storage) return null;
    try {
      return storage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function ready(fn) {
    if (!fn) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function applyState(root, collapsed) {
    if (!root) return;
    var isCollapsed = !!collapsed;
    root.classList.toggle('is-collapsed', isCollapsed);
    var layout = root.closest('.canopy-layout');
    if (layout) layout.classList.toggle('canopy-layout--content-nav-collapsed', isCollapsed);
    var nav = root.querySelector('[data-canopy-content-nav]');
    if (nav) {
      nav.classList.toggle('canopy-content-navigation--collapsed', isCollapsed);
      nav.classList.toggle('canopy-content-navigation--expanded', !isCollapsed);
      nav.setAttribute('data-expanded', isCollapsed ? 'false' : 'true');
    }
    var toggle = root.querySelector('[data-canopy-content-nav-toggle]');
    if (toggle) {
      var showLabel = toggle.getAttribute('data-show-label') || 'Show';
      var hideLabel = toggle.getAttribute('data-hide-label') || 'Hide';
      var showFull = toggle.getAttribute('data-show-full-label') || 'Show section navigation';
      var hideFull = toggle.getAttribute('data-hide-full-label') || 'Hide section navigation';
      var labelNode = toggle.querySelector('[data-canopy-content-nav-toggle-label]');
      var srNode = toggle.querySelector('[data-canopy-content-nav-toggle-sr]');
      toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      toggle.setAttribute('aria-label', isCollapsed ? showFull : hideFull);
      toggle.setAttribute('title', isCollapsed ? showFull : hideFull);
      toggle.classList.toggle('is-collapsed', isCollapsed);
      toggle.classList.toggle('is-expanded', !isCollapsed);
      if (labelNode) {
        labelNode.textContent = isCollapsed ? showLabel : hideLabel;
      } else {
        toggle.textContent = isCollapsed ? showLabel : hideLabel;
      }
      if (srNode) {
        srNode.textContent = isCollapsed ? showFull : hideFull;
      }
    }
    if (root.__canopyContentNavSync) {
      try {
        root.__canopyContentNavSync();
      } catch (_) {}
    }
  }

  function setupFloatingState(root) {
    if (!root || typeof IntersectionObserver !== 'function') return;
    if (root.__canopyContentNavFloating) return;
    var sentinel = root.querySelector('[data-canopy-content-nav-sentinel]');
    var placeholder = root.querySelector('[data-canopy-content-nav-placeholder]');
    var nav = root.querySelector('[data-canopy-content-nav]');
    if (!sentinel || !nav) return;
    root.__canopyContentNavFloating = true;

    function syncPosition() {
      try {
        var rect = root.getBoundingClientRect();
        nav.style.setProperty('--canopy-content-nav-fixed-left', rect.left + 'px');
        nav.style.setProperty('--canopy-content-nav-fixed-width', rect.width + 'px');
        if (placeholder) placeholder.style.width = rect.width + 'px';
      } catch (_) {}
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        nav.classList.toggle('canopy-content-navigation--floating', stuck);
        nav.setAttribute('data-stuck', stuck ? 'true' : 'false');
        if (placeholder) {
          placeholder.style.height = stuck ? nav.offsetHeight + 'px' : '0px';
        }
      });
    });

    observer.observe(sentinel);
    syncPosition();
    var handleResize = function () {
      syncPosition();
    };
    window.addEventListener('resize', handleResize);
    root.__canopyContentNavCleanup = function () {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
    root.__canopyContentNavSync = syncPosition;
  }

  function computeOffsetPx() {
    try {
      var root = document.documentElement;
      var size = root ? parseFloat(window.getComputedStyle(root).fontSize || '16') || 16 : 16;
      return size * 1.618;
    } catch (error) {
      return 0;
    }
  }

  function setupActiveHeadingWatcher(root) {
    if (!root || root.__canopyContentNavActive) return;
    var nav = root.querySelector('[data-canopy-content-nav]');
    if (!nav) return;
    var linkNodes = Array.prototype.slice.call(
      nav.querySelectorAll('.canopy-nav-tree__link[href^="#"]')
    );
    var entries = linkNodes
      .map(function (link) {
        if (!link || !link.getAttribute) return null;
        var href = link.getAttribute('href') || '';
        if (!href || href.charAt(0) !== '#') return null;
        var id = href.slice(1);
        if (!id) return null;
        var target = document.getElementById(id);
        if (!target) return null;
        return {
          id: id,
          link: link,
          target: target,
          item: link.closest('[data-canopy-nav-item]') || null,
        };
      })
      .filter(Boolean);
    if (!entries.length) return;
    root.__canopyContentNavActive = true;
    var activeId = null;

    function expandParents(link) {
      var parent = link ? link.closest('[data-canopy-nav-item]') : null;
      while (parent) {
        parent.setAttribute('data-expanded', 'true');
        var toggle = parent.querySelector('[data-canopy-nav-item-toggle]');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'true');
          var targetId = toggle.getAttribute('data-canopy-nav-item-toggle');
          if (targetId) {
            var panel = document.getElementById(targetId);
            if (panel) {
              panel.hidden = false;
              panel.removeAttribute('hidden');
              panel.setAttribute('aria-hidden', 'false');
            }
          }
        }
        parent = parent.parentElement
          ? parent.parentElement.closest('[data-canopy-nav-item]')
          : null;
      }
    }

    function applyActive(id) {
      if (!id || activeId === id) return;
      activeId = id;
      var activeParents = new Set();
      entries.forEach(function (entry) {
        var isActive = entry.id === id;
        entry.link.classList.toggle('is-active', isActive);
        if (entry.item) entry.item.classList.toggle('is-active', isActive);
        if (isActive) {
          expandParents(entry.link);
          var parent = entry.link.closest('[data-canopy-nav-item]');
          while (parent) {
            activeParents.add(parent);
            parent = parent.parentElement
              ? parent.parentElement.closest('[data-canopy-nav-item]')
              : null;
          }
        }
      });
      entries.forEach(function (entry) {
        var item = entry.item;
        if (!item) return;
        if (!activeParents.has(item) && entry.id !== id) {
          item.setAttribute('data-expanded', 'false');
          var toggle = item.querySelector('[data-canopy-nav-item-toggle]');
          if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
            var targetId = toggle.getAttribute('data-canopy-nav-item-toggle');
            if (targetId) {
              var panel = document.getElementById(targetId);
              if (panel) {
                panel.hidden = true;
                panel.setAttribute('hidden', '');
                panel.setAttribute('aria-hidden', 'true');
              }
            }
          }
        }
      });
    }

    function updateActive() {
      var offset = computeOffsetPx();
      var viewportLimit = window.innerHeight ? window.innerHeight * 0.5 : 0;
      var fallbackId = entries[0].id;
      var bestId = fallbackId;
      var bestDistance = Number.POSITIVE_INFINITY;
      entries.forEach(function (entry) {
        if (!entry || !entry.target) return;
        var rect = entry.target.getBoundingClientRect();
        var relativeTop = rect.top - offset;
        if (viewportLimit > 0 && relativeTop < -viewportLimit) return;
        var distance = Math.abs(relativeTop);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = entry.id;
        }
      });
      applyActive(bestId || fallbackId);
    }

    updateActive();
    var ticking = false;
    function handle() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        updateActive();
        ticking = false;
      });
    }
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);
  }

  ready(function () {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll('[data-canopy-content-nav-root]')
    );
    if (!roots.length) return;
    var stored = getStored();
    var collapsed = true;
    if (stored === '0' || stored === 'false') {
      collapsed = false;
    } else if (stored === '1' || stored === 'true') {
      collapsed = true;
    }

    function sync(next) {
      collapsed = !!next;
      roots.forEach(function (root) {
        applyState(root, collapsed);
      });
      setStored(collapsed ? '1' : '0');
    }

    sync(collapsed);

    roots.forEach(function (root) {
      var toggle = root.querySelector('[data-canopy-content-nav-toggle]');
      if (!toggle) return;
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        sync(!collapsed);
      });
    });

    roots.forEach(function (root) {
      setupFloatingState(root);
      setupActiveHeadingWatcher(root);
    });
  });
})();
  `;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function Layout({
  children,
  sidebar,
  navigation = true,
  fluid = false,
  contentNavigation = true,
  className = "",
  contentClassName = "",
  sidebarClassName = "",
  contentNavigationClassName = "",
  ...rest
}) {
  const PageContext =
    navigationHelpers && typeof navigationHelpers.getPageContext === "function"
      ? navigationHelpers.getPageContext()
      : null;
  const context = PageContext ? React.useContext(PageContext) : null;
  const pageHeadings = React.useMemo(() => {
    const headings = context && context.page ? context.page.headings : null;
    return Array.isArray(headings) ? headings : [];
  }, [context]);
  const contentHeading = React.useMemo(() => {
    const first = pageHeadings.find((heading) => {
      const depth = heading && (heading.depth || heading.level);
      return depth === 1;
    });
    return first && first.title ? first.title : null;
  }, [pageHeadings]);
  const headingAnchorId = React.useMemo(() => {
    const first = pageHeadings.find((heading) => {
      const depth = heading && (heading.depth || heading.level);
      return depth === 1;
    });
    return first && first.id ? first.id : null;
  }, [pageHeadings]);
  const headingTree = React.useMemo(
    () => buildHeadingTree(pageHeadings),
    [pageHeadings]
  );

  const showLeftColumn = navigation !== false;
  const hasContentNavigation =
    navigation !== false &&
    contentNavigation !== false &&
    headingTree.length > 0;

  const containerClassName = (() => {
    const classes = ["canopy-layout"];
    classes.push(fluid ? "canopy-layout--fluid" : "canopy-layout--fixed");
    if (showLeftColumn) classes.push("canopy-layout--with-sidebar");
    if (hasContentNavigation) {
      classes.push("canopy-layout--with-content-nav");
      classes.push("canopy-layout--content-nav-collapsed");
    }
    if (className) classes.push(className);
    return classes.join(" ");
  })();

  const leftAsideClassName = ["canopy-layout__sidebar", sidebarClassName]
    .filter(Boolean)
    .join(" ");

  const contentClassNames = ["canopy-layout__content", contentClassName]
    .filter(Boolean)
    .join(" ");

  const contentNavigationAsideClassName = [
    "canopy-layout__content-nav",
    "is-collapsed",
    contentNavigationClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const sidebarNode = showLeftColumn
    ? buildNavigationAside(sidebar, sidebarClassName)
    : null;

  return (
    <div className={containerClassName} {...rest}>
      {showLeftColumn ? (
        <aside className={leftAsideClassName}>{sidebarNode}</aside>
      ) : null}
      <div className={contentClassNames}>{children}</div>
      {hasContentNavigation ? (
        <>
          <aside
            className={contentNavigationAsideClassName}
            data-canopy-content-nav-root="true"
          >
            <div
              data-canopy-content-nav-sentinel="true"
              aria-hidden="true"
            />
            <ContentNavigation
              items={headingTree}
              heading={contentHeading || undefined}
              headingId={headingAnchorId || undefined}
              pageTitle={
                context && context.page ? context.page.title : undefined
              }
            />
            <div
              data-canopy-content-nav-placeholder="true"
              aria-hidden="true"
            />
          </aside>
          <ContentNavigationScript />
        </>
      ) : null}
    </div>
  );
}
