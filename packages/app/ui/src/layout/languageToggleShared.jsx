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
  const {pathname, suffix} = splitHref(pageHref);
  const {locale: activeLocale, pathname: basePathname} = stripLocaleFromPath(
    pathname,
    locales,
    defaultLocale,
  );
  const messageMap = toggle && toggle.messages ? toggle.messages : {};
  const defaultCopy = messageMap.__default ? {...messageMap.__default} : {};
  const localeCopy = messageMap[activeLocale.lang]
    ? {...defaultCopy, ...messageMap[activeLocale.lang]}
    : defaultCopy;
  const label = localeCopy.label || "Language";
  const ariaLabel = localeCopy.ariaLabel || label || "Language";
  const links = locales.map((locale) => ({
    lang: locale.lang,
    label: locale.label || locale.lang.toUpperCase(),
    href: buildLocaleHref(locale, basePathname, suffix, defaultLocale),
    isActive: locale.lang === activeLocale.lang,
  }));
  return {label, ariaLabel, links};
}

export function LanguageToggleControl({
  config,
  variant = "inline",
  className = "",
  showLabel = true,
}) {
  if (!config) return null;
  const classes = [
    "canopy-language-toggle",
    variant ? `canopy-language-toggle--${variant}` : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const ariaLabel = config.ariaLabel || config.label || "Language";
  return (
    <div className={classes || undefined}>
      {showLabel && config.label ? (
        <span className="canopy-language-toggle__label">{config.label}</span>
      ) : null}
      <nav className="canopy-language-toggle__nav" aria-label={ariaLabel}>
        {config.links.map((link) => (
          <a
            key={link.lang}
            href={link.href}
            aria-current={link.isActive ? "true" : undefined}
            data-active={link.isActive ? "true" : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
