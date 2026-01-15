import React from "react";
import SearchPanel from "../search/SearchPanel.jsx";
import CanopyBrand from "./CanopyBrand.jsx";
import CanopyModal from "./CanopyModal.jsx";

function HeaderScript() {
  const code = `
(function () {
  if (typeof window === 'undefined') return;

  var doc = document;
  var body = doc.body;
  var root = doc.documentElement;

  function ready(fn) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(function () {
    var header = doc.querySelector('.canopy-header');
    if (!header) return;

    var NAV_ATTR = 'data-mobile-nav';
    var SEARCH_ATTR = 'data-mobile-search';

    function modalFor(type) {
      return doc.querySelector('[data-canopy-modal="' + type + '"]');
    }

    function each(list, fn) {
      if (!list || typeof fn !== 'function') return;
      Array.prototype.forEach.call(list, fn);
    }

    function setExpanded(type, expanded) {
      var toggles = header.querySelectorAll('[data-canopy-header-toggle="' + type + '"]');
      each(toggles, function (btn) {
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
      var modal = modalFor(type);
      if (modal) {
        modal.setAttribute('data-open', expanded ? 'true' : 'false');
        modal.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      }
    }

    function lockScroll(shouldLock) {
      if (!body) return;
      if (shouldLock) {
        if (!body.dataset.canopyScrollLock) {
          body.dataset.canopyScrollPrevOverflow = body.style.overflow || '';
          if (root && root.dataset) {
            root.dataset.canopyScrollPrevOverflow = root.style.overflow || '';
          }
        }
        body.dataset.canopyScrollLock = '1';
        body.style.overflow = 'hidden';
        if (root) root.style.overflow = 'hidden';
      } else {
        if (body.dataset.canopyScrollLock) {
          delete body.dataset.canopyScrollLock;
          body.style.overflow = body.dataset.canopyScrollPrevOverflow || '';
          delete body.dataset.canopyScrollPrevOverflow;
        }
        if (root && root.dataset) {
          root.style.overflow = root.dataset.canopyScrollPrevOverflow || '';
          delete root.dataset.canopyScrollPrevOverflow;
        }
      }
    }

    function stateFor(type) {
      if (type === 'nav') return header.getAttribute(NAV_ATTR);
      if (type === 'search') return header.getAttribute(SEARCH_ATTR);
      return 'closed';
    }

    function focusSearchForm() {
      var input = header.querySelector('[data-canopy-search-form-input]');
      if (!input) return;
      var raf = typeof window !== 'undefined' && window.requestAnimationFrame;
      (raf || function (fn) { return setTimeout(fn, 16); })(function () {
        try {
          input.focus({ preventScroll: true });
        } catch (_) {
          try { input.focus(); } catch (_) {}
        }
      });
    }

    function focusNavMenu() {
      var modal = modalFor('nav');
      if (!modal) return;
      var target = modal.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])');
      if (!target) return;
      var raf = typeof window !== 'undefined' && window.requestAnimationFrame;
      (raf || function (fn) { return setTimeout(fn, 16); })(function () {
        try {
          target.focus({ preventScroll: true });
        } catch (_) {
          try { target.focus(); } catch (_) {}
        }
      });
    }

    function setState(type, next) {
      if (type === 'nav') header.setAttribute(NAV_ATTR, next);
      if (type === 'search') header.setAttribute(SEARCH_ATTR, next);
      setExpanded(type, next === 'open');
      var navOpen = header.getAttribute(NAV_ATTR) === 'open';
      var searchOpen = header.getAttribute(SEARCH_ATTR) === 'open';
      lockScroll(navOpen || searchOpen);
    }

    function toggle(type, force) {
      var current = stateFor(type) === 'open';
      var shouldOpen = typeof force === 'boolean' ? force : !current;
      if (shouldOpen && type === 'nav') setState('search', 'closed');
      if (shouldOpen && type === 'search') setState('nav', 'closed');
      setState(type, shouldOpen ? 'open' : 'closed');
      if (type === 'search' && shouldOpen) focusSearchForm();
      if (type === 'nav' && shouldOpen) focusNavMenu();
    }

    each(header.querySelectorAll('[data-canopy-header-toggle]'), function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        var type = btn.getAttribute('data-canopy-header-toggle');
        if (!type) return;
        toggle(type);
      });
    });

    each(doc.querySelectorAll('[data-canopy-header-close]'), function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-canopy-header-close');
        if (!type) return;
        toggle(type, false);
      });
    });

    var navModal = modalFor('nav');
    if (navModal) {
      navModal.addEventListener('click', function (event) {
        if (event.target === navModal) {
          toggle('nav', false);
          return;
        }
        var target = event.target && event.target.closest && event.target.closest('a');
        if (!target) return;
        toggle('nav', false);
      });
    }

    var searchModal = modalFor('search');
    if (searchModal) {
      searchModal.addEventListener('click', function (event) {
        if (event.target === searchModal) toggle('search', false);
      });
    }

    doc.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var navOpen = header.getAttribute(NAV_ATTR) === 'open';
      var searchOpen = header.getAttribute(SEARCH_ATTR) === 'open';
      if (!navOpen && !searchOpen) return;
      event.preventDefault();
      toggle('nav', false);
      toggle('search', false);
    });

    var mq = window.matchMedia('(min-width: 48rem)');
    function syncDesktopState() {
      if (mq.matches) {
        setState('nav', 'closed');
        setState('search', 'closed');
        setExpanded('nav', false);
        setExpanded('search', false);
        lockScroll(false);
      }
    }

    try {
      mq.addEventListener('change', syncDesktopState);
    } catch (_) {
      mq.addListener(syncDesktopState);
    }

    syncDesktopState();
  });
})();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: code,
      }}
    />
  );
}

const CONTEXT_KEY =
  typeof Symbol === "function"
    ? Symbol.for("__CANOPY_PAGE_CONTEXT__")
    : "__CANOPY_PAGE_CONTEXT__";

function getSharedRoot() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return null;
}

function getSafePageContext() {
  const root = getSharedRoot();
  if (root && root[CONTEXT_KEY]) return root[CONTEXT_KEY];
  const ctx = React.createContext({ navigation: null, page: null });
  if (root) root[CONTEXT_KEY] = ctx;
  return ctx;
}

function ensureArray(navLinks) {
  if (!Array.isArray(navLinks)) return [];
  return navLinks.filter(
    (link) => link && typeof link === "object" && typeof link.href === "string"
  );
}

function SectionNavList({ root }) {
  if (!root || !Array.isArray(root.children) || !root.children.length) return null;
  return (
    <ul className="canopy-modal__section-list" role="list">
      {root.children.map((node) => (
        <SectionNavItem key={node.slug || node.href || node.title} node={node} depth={0} />
      ))}
    </ul>
  );
}

function SectionNavItem({ node, depth }) {
  if (!node) return null;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const Tag = node.href ? "a" : "span";
  const classes = [
    "canopy-modal__section-link",
    `depth-${Math.min(5, Math.max(0, depth + 1))}`,
  ];
  if (!node.href) classes.push("is-label");
  if (node.isActive) classes.push("is-active");

  return (
    <li className="canopy-modal__section-item" data-depth={depth}>
      <Tag
        className={classes.join(" ")}
        href={node.href || undefined}
        aria-current={node.isActive ? "page" : undefined}
      >
        {node.title || node.slug}
      </Tag>
      {hasChildren ? (
        <ul className="canopy-modal__section-list canopy-modal__section-list--nested" role="list">
          {node.children.map((child) => (
            <SectionNavItem key={child.slug || child.href || child.title} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function CanopyHeader(props = {}) {
  const {
    navigation: navLinksProp,
    searchLabel = "Search",
    searchHotkey = "mod+k",
    searchPlaceholder = "Search…",
    brandHref = "/",
    title = "Canopy IIIF",
    logo: SiteLogo,
  } = props;

  const navLinks = ensureArray(navLinksProp);
  const PageContext = getSafePageContext();
  const context = React.useContext(PageContext);
  const sectionNavigation =
    context && context.navigation && context.navigation.root
      ? context.navigation
      : null;
  const sectionHeading =
    (sectionNavigation && sectionNavigation.title) ||
    (sectionNavigation && sectionNavigation.root
      ? sectionNavigation.root.title
      : "");
  const hasSectionNav = !!(
    sectionNavigation &&
    sectionNavigation.root &&
    Array.isArray(sectionNavigation.root.children) &&
    sectionNavigation.root.children.length
  );
  const sectionLabel = sectionHeading
    ? `More in ${sectionHeading}`
    : "More in this section";
  const sectionAriaLabel = sectionHeading
    ? `${sectionHeading} section navigation`
    : "Section navigation";

  return (
    <>
      <header
        className="canopy-header"
        data-mobile-nav="closed"
        data-mobile-search="closed"
      >
        <div className="canopy-header__brand">
          <CanopyBrand
            label={title}
            href={brandHref}
            className="canopy-header__brand-link"
            Logo={SiteLogo}
          />
        </div>

        <div className="canopy-header__desktop-search">
          <SearchPanel
            label={searchLabel}
            hotkey={searchHotkey}
            placeholder={searchPlaceholder}
          />
        </div>

        <nav
          className="canopy-nav-links canopy-header__desktop-nav"
          aria-label="Primary navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.isActive ? "page" : undefined}
            >
              {link.label || link.href}
            </a>
          ))}
        </nav>

        <div className="canopy-header__actions">
          <button
            type="button"
            className="canopy-header__icon-button canopy-header__search-trigger"
            aria-label="Open search"
            aria-controls="canopy-modal-search"
            aria-expanded="false"
            data-canopy-header-toggle="search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="canopy-header__search-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-3.8-3.8M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="canopy-header__icon-button canopy-header__menu"
            aria-label="Open navigation"
            aria-controls="canopy-modal-nav"
            aria-expanded="false"
            data-canopy-header-toggle="nav"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="canopy-header__menu-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>
      </header>

      <CanopyModal
        id="canopy-modal-nav"
        variant="nav"
        labelledBy="canopy-modal-nav-label"
        label={title}
        logo={SiteLogo}
        href={brandHref}
        closeLabel="Close navigation"
        closeDataAttr="nav"
      >
        <nav
          className="canopy-nav-links canopy-modal__nav"
          aria-label="Primary navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.isActive ? "page" : undefined}
            >
              {link.label || link.href}
            </a>
          ))}
        </nav>
        {hasSectionNav ? (
          <nav
            className="canopy-modal__section-nav"
            aria-label={sectionAriaLabel}
          >
            <div className="canopy-modal__section-label">{sectionLabel}</div>
            <SectionNavList root={sectionNavigation.root} />
          </nav>
        ) : null}
      </CanopyModal>

      <CanopyModal
        id="canopy-modal-search"
        variant="search"
        labelledBy="canopy-modal-search-label"
        label={title}
        logo={SiteLogo}
        href={brandHref}
        closeLabel="Close search"
        closeDataAttr="search"
        bodyClassName="canopy-modal__body--search"
      >
        <SearchPanel
          label={searchLabel}
          hotkey={searchHotkey}
          placeholder={searchPlaceholder}
        />
      </CanopyModal>

      <HeaderScript />
    </>
  );
}
