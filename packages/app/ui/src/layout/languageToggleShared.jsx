import React from "react";

function readBasePath() {
  const normalize = (value) => {
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
    const cleaned = prefixed.replace(/\/+$/, "");
    return cleaned === "/" ? "" : cleaned;
  };
  try {
    if (typeof window !== "undefined" && window.CANOPY_BASE_PATH != null) {
      const candidate = normalize(window.CANOPY_BASE_PATH);
      if (candidate || candidate === "") return candidate;
    }
  } catch (_) {}
  try {
    if (typeof globalThis !== "undefined" && globalThis.CANOPY_BASE_PATH != null) {
      const candidate = normalize(globalThis.CANOPY_BASE_PATH);
      if (candidate || candidate === "") return candidate;
    }
  } catch (_) {}
  try {
    if (typeof process !== "undefined" && process.env && process.env.CANOPY_BASE_PATH) {
      const candidate = normalize(process.env.CANOPY_BASE_PATH);
      if (candidate || candidate === "") return candidate;
    }
  } catch (_) {}
  return "";
}

function withBasePath(href) {
  try {
    const raw = typeof href === "string" ? href.trim() : "";
    if (!raw) return raw;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return raw;
    if (!raw.startsWith("/")) return raw;
    const base = readBasePath();
    if (!base || base === "/") return raw;
    if (raw === base || raw.startsWith(`${base}/`)) return raw;
    return `${base}${raw}`;
  } catch (_) {
    return href;
  }
}

function normalizeLocales(locales) {
  if (!Array.isArray(locales)) return [];
  const normalized = locales
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const lang = typeof entry.lang === "string" ? entry.lang.trim() : "";
      if (!lang) return null;
      const label =
        typeof entry.label === "string" && entry.label.trim()
          ? entry.label.trim()
          : lang.toUpperCase();
      return {lang, label, default: entry.default === true, index};
    })
    .filter(Boolean);
  if (!normalized.length) return [];
  const explicitDefault = normalized.find((item) => item.default);
  if (explicitDefault) {
    normalized.forEach((item) => {
      item.default = item.index === explicitDefault.index;
    });
  } else {
    normalized[0].default = true;
  }
  return normalized.map(({index, ...rest}) => rest);
}

function splitHref(href = "/") {
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      const url = new URL(href);
      return {
        pathname: url.pathname || "/",
        suffix: `${url.search || ""}${url.hash || ""}`,
      };
    }
  } catch (_) {}
  const raw = typeof href === "string" ? href : String(href || "/");
  const match = raw.match(/^[^?#]+/);
  const pathname = match ? match[0] : "/";
  const suffix = raw.slice(pathname.length);
  return {
    pathname: pathname || "/",
    suffix,
  };
}

function normalizePathname(pathname = "/") {
  if (!pathname) return "/";
  const trimmed = pathname.trim();
  if (!trimmed) return "/";
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  return trimmed === "/" ? "/" : `/${trimmed.replace(/^\/+/, "")}`;
}

function stripLocaleFromPath(pathname, locales, defaultLocale) {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath.replace(/^\/+/, "").split("/");
  const first = segments[0] || "";
  const match = locales.find((loc) => loc.lang === first);
  if (match && match.lang !== defaultLocale.lang) {
    segments.shift();
    const remainder = segments.join("/");
    return {
      locale: match,
      pathname: remainder ? `/${remainder}` : "/",
    };
  }
  return {locale: defaultLocale, pathname: normalizedPath};
}

function buildLocaleHref(locale, basePath, suffix, defaultLocale) {
  const normalizedBase = normalizePathname(basePath);
  const needsPrefix = locale.lang !== defaultLocale.lang;
  const prefixed = needsPrefix
    ? `/${locale.lang}${normalizedBase === "/" ? "" : normalizedBase}`
    : normalizedBase;
  const href = withBasePath(prefixed || "/");
  return `${href}${suffix || ""}`;
}

export function buildLanguageToggleConfig(toggle, page) {
  if (!toggle || !Array.isArray(toggle.locales)) return null;
  const locales = normalizeLocales(toggle.locales);
  if (locales.length <= 1) return null;
  const defaultLocale = locales.find((loc) => loc.default) || locales[0];
  const pageHref = page && page.href ? page.href : "/";
  const {pathname} = splitHref(pageHref);
  const {locale: activeLocale} = stripLocaleFromPath(
    pathname,
    locales,
    defaultLocale,
  );
  const homePathname = "/";
  const homeSuffix = "";
  const messageMap = toggle && toggle.messages ? toggle.messages : {};
  const defaultCopy = messageMap.__default || {};
  const localeCopy = messageMap[activeLocale.lang] || null;
  const fallbackLabel = defaultCopy.label || "Language";
  const label =
    (localeCopy && localeCopy.label) || fallbackLabel;
  const links = locales.map((locale) => ({
    lang: locale.lang,
    label: locale.label || locale.lang.toUpperCase(),
    href: buildLocaleHref(locale, homePathname, homeSuffix, defaultLocale),
    isActive: locale.lang === activeLocale.lang,
  }));
  return {label, links};
}

export function LanguageToggleControl({
  config,
  variant = "inline",
  className = "",
  showLabel = false,
  control = "select",
}) {
  if (!config) return null;
  const classes = [
    "canopy-language-toggle",
    variant ? `canopy-language-toggle--${variant}` : null,
    control ? `canopy-language-toggle--${control}` : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const ariaLabel = config.label || "Language";
  const resolvedControl = control === "list" ? "list" : "select";
  const selectId =
    typeof React.useId === "function" && resolvedControl === "select"
      ? React.useId()
      : undefined;
  const links = Array.isArray(config.links) ? config.links : [];
  if (!links.length) return null;
  const activeLink = links.find((link) => link.isActive);
  const fallbackHref = links[0].href;
  const selectedHref = activeLink ? activeLink.href : fallbackHref;
  const navigate = React.useCallback((href) => {
    if (!href) return;
    try {
      if (typeof window !== "undefined" && window.location) {
        if (typeof window.location.assign === "function") {
          window.location.assign(href);
        } else {
          window.location.href = href;
        }
        return;
      }
    } catch (_) {}
    try {
      if (typeof document !== "undefined" && document.location) {
        document.location.href = href;
      }
    } catch (_) {}
  }, []);
  const handleSelectChange = React.useCallback(
    (event) => {
      if (!event || !event.target) return;
      const nextHref = event.target.value;
      if (!nextHref || nextHref === selectedHref) return;
      navigate(nextHref);
    },
    [navigate, selectedHref],
  );
  const labelElement =
    showLabel && config.label
      ? resolvedControl === "select"
        ? (
            <label
              className="canopy-language-toggle__label"
              htmlFor={selectId}
            >
              {config.label}
            </label>
          )
        : (
            <span className="canopy-language-toggle__label">
              {config.label}
            </span>
          )
      : null;
  return (
    <div className={classes || undefined}>
      {labelElement}
      {resolvedControl === "select" ? (
        <div className="canopy-language-toggle__select">
          <select
            id={selectId}
            className="canopy-language-toggle__select-input"
            value={selectedHref}
            onChange={handleSelectChange}
            aria-label={ariaLabel}
            data-canopy-language-select="true"
          >
            {links.map((link) => (
              <option
                key={link.lang}
                value={link.href}
                data-lang={link.lang}
                data-canopy-language-option="true"
              >
                {link.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <nav className="canopy-language-toggle__nav" aria-label={ariaLabel}>
          <ul className="canopy-language-toggle__list" role="list">
            {links.map((link) => (
              <li key={link.lang}>
                <button
                  type="button"
                  className="canopy-language-toggle__button"
                  data-active={link.isActive ? "true" : undefined}
                  aria-pressed={link.isActive ? "true" : "false"}
                  data-canopy-language-button="true"
                  data-href={link.href}
                  onClick={() => navigate(link.href)}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <LanguageToggleRuntime />
    </div>
  );
}

function LanguageToggleRuntime() {
  const code = `
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CANOPY_LANGUAGE_TOGGLE_INIT__) return;
  window.__CANOPY_LANGUAGE_TOGGLE_INIT__ = true;

  function navigate(href) {
    if (!href) return;
    try {
      if (window.location && typeof window.location.assign === 'function') {
        window.location.assign(href);
      } else if (window.location) {
        window.location.href = href;
      }
    } catch (_) {}
  }

  function bindSelect(select) {
    if (!select || select.dataset.canopyLanguageBound === 'true') return;
    select.dataset.canopyLanguageBound = 'true';
    select.addEventListener('change', function (event) {
      var target = event && event.target ? event.target : select;
      var href = target && target.value;
      if (!href || href === '#') return;
      navigate(href);
    });
  }

  function bindButtons(root) {
    var buttons = root.querySelectorAll('[data-canopy-language-button]');
    Array.prototype.forEach.call(buttons, function (btn) {
      if (!btn || btn.dataset.canopyLanguageBound === 'true') return;
      btn.dataset.canopyLanguageBound = 'true';
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        var href = btn.getAttribute('data-href');
        navigate(href);
      });
    });
  }

  function scan(root) {
    if (!root) root = document;
    var selects = root.querySelectorAll('[data-canopy-language-select]');
    Array.prototype.forEach.call(selects, bindSelect);
    bindButtons(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      scan(document);
    });
  } else {
    scan(document);
  }
})();
  `;
  return <script dangerouslySetInnerHTML={{__html: code}} />;
}
