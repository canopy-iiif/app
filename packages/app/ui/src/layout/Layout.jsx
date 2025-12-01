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
    if (nav) nav.classList.toggle('canopy-content-navigation--collapsed', isCollapsed);
    var toggle = root.querySelector('[data-canopy-content-nav-toggle]');
    if (toggle) {
      var showLabel = toggle.getAttribute('data-show-label') || 'Show';
      var hideLabel = toggle.getAttribute('data-hide-label') || 'Hide';
      var showFull = toggle.getAttribute('data-show-full-label') || 'Show section navigation';
      var hideFull = toggle.getAttribute('data-hide-full-label') || 'Hide section navigation';
      toggle.textContent = isCollapsed ? showLabel : hideLabel;
      toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      toggle.setAttribute('aria-label', isCollapsed ? showFull : hideFull);
      toggle.setAttribute('title', isCollapsed ? showFull : hideFull);
    }
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
            <ContentNavigation
              items={headingTree}
              heading={contentHeading || undefined}
              headingId={headingAnchorId || undefined}
              pageTitle={
                context && context.page ? context.page.title : undefined
              }
            />
          </aside>
          <ContentNavigationScript />
        </>
      ) : null}
    </div>
  );
}
