import {MagnifyingGlassIcon} from "../Icons";
import React from "react";

function readBasePath() {
  const normalize = (val) => {
    const raw = typeof val === "string" ? val.trim() : "";
    if (!raw) return "";
    return raw.replace(/\/+$/, "");
  };
  try {
    if (typeof window !== "undefined" && window.CANOPY_BASE_PATH != null) {
      const fromWindow = normalize(window.CANOPY_BASE_PATH);
      if (fromWindow) return fromWindow;
    }
  } catch (_) {}
  try {
    if (
      typeof globalThis !== "undefined" &&
      globalThis.CANOPY_BASE_PATH != null
    ) {
      const fromGlobal = normalize(globalThis.CANOPY_BASE_PATH);
      if (fromGlobal) return fromGlobal;
    }
  } catch (_) {}
  try {
    if (
      typeof process !== "undefined" &&
      process.env &&
      process.env.CANOPY_BASE_PATH
    ) {
      const fromEnv = normalize(process.env.CANOPY_BASE_PATH);
      if (fromEnv) return fromEnv;
    }
  } catch (_) {}
  return "";
}

function isAbsoluteUrl(href) {
  try {
    return /^https?:/i.test(String(href || ""));
  } catch (_) {
    return false;
  }
}

export function resolveSearchPath(pathValue) {
  let raw = typeof pathValue === "string" ? pathValue.trim() : "";
  if (!raw) raw = "/search";
  if (isAbsoluteUrl(raw)) return raw;
  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  const base = readBasePath();
  if (!base) return normalizedPath;
  const baseWithLead = base.startsWith("/") ? base : `/${base}`;
  const baseTrimmed = baseWithLead.replace(/\/+$/, "");
  if (!baseTrimmed) return normalizedPath;
  if (
    normalizedPath === baseTrimmed ||
    normalizedPath.startsWith(`${baseTrimmed}/`)
  ) {
    return normalizedPath;
  }
  const pathTrimmed = normalizedPath.replace(/^\/+/, "");
  return `${baseTrimmed}/${pathTrimmed}`;
}

export default function SearchPanelForm(props = {}) {
  const {
    placeholder = "Search…",
    buttonLabel = "Search",
    label,
    searchPath = "/search",
    inputId: inputIdProp,
  } = props || {};

  const text =
    typeof label === "string" && label.trim() ? label.trim() : buttonLabel;
  const action = React.useMemo(
    () => resolveSearchPath(searchPath),
    [searchPath]
  );
  const autoId = typeof React.useId === "function" ? React.useId() : undefined;
  const [fallbackId] = React.useState(
    () => `canopy-search-form-${Math.random().toString(36).slice(2, 10)}`
  );
  const inputId = inputIdProp || autoId || fallbackId;
  const inputRef = React.useRef(null);
  const [hasValue, setHasValue] = React.useState(false);

  const focusInput = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    try {
      el.focus({preventScroll: true});
    } catch (_) {
      try {
        el.focus();
      } catch (_) {}
    }
  }, []);

  const handlePointerDown = React.useCallback(
    (event) => {
      const target = event.target;
      if (target && typeof target.closest === "function") {
        if (target.closest("[data-canopy-search-form-trigger]")) return;
      }
      event.preventDefault();
      focusInput();
    },
    [focusInput]
  );

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (el.value && el.value.trim()) {
      setHasValue(true);
    }
  }, []);

  const handleInputChange = React.useCallback((event) => {
    const nextHasValue = Boolean(event?.target?.value && event.target.value.trim());
    setHasValue(nextHasValue);
  }, []);

  return (
    <form
      action={action}
      method="get"
      role="search"
      autoComplete="off"
      spellCheck="false"
      className="canopy-search-form canopy-search-form-shell"
      onPointerDown={handlePointerDown}
      data-placeholder={placeholder || ""}
      data-has-value={hasValue ? "1" : "0"}
    >
      <label
        htmlFor={inputId}
        className="canopy-search-form__label"
      >
        <MagnifyingGlassIcon className="canopy-search-form__icon" />
        <input
          id={inputId}
          type="search"
          name="q"
          inputMode="search"
          data-canopy-search-form-input
          placeholder={placeholder}
          className="canopy-search-form__input"
          aria-label="Search"
          ref={inputRef}
          onChange={handleInputChange}
          onInput={handleInputChange}
        />
      </label>
      <button
        type="submit"
        data-canopy-search-form-trigger="submit"
        className="canopy-search-form__submit"
      >
        <span>{text}</span>
        <span aria-hidden className="canopy-search-form__shortcut">
          <span>⌘</span>
          <span>K</span>
        </span>
      </button>
    </form>
  );
}
