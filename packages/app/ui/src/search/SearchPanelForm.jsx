import { MagnifyingGlassIcon } from "../Icons";
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
    if (typeof globalThis !== "undefined" && globalThis.CANOPY_BASE_PATH != null) {
      const fromGlobal = normalize(globalThis.CANOPY_BASE_PATH);
      if (fromGlobal) return fromGlobal;
    }
  } catch (_) {}
  try {
    if (typeof process !== "undefined" && process.env && process.env.CANOPY_BASE_PATH) {
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
  const autoId = typeof React.useId === 'function' ? React.useId() : undefined;
  const [fallbackId] = React.useState(
    () => `canopy-cmdk-${Math.random().toString(36).slice(2, 10)}`
  );
  const inputId = inputIdProp || autoId || fallbackId;
  const inputRef = React.useRef(null);

  const focusInput = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    try { el.focus({ preventScroll: true }); }
    catch (_) {
      try { el.focus(); } catch (_) {}
    }
  }, []);

  const handlePointerDown = React.useCallback((event) => {
    const target = event.target;
    if (target && typeof target.closest === 'function') {
      if (target.closest('[data-canopy-command-trigger]')) return;
    }
    event.preventDefault();
    focusInput();
  }, [focusInput]);

  return (
    <form
      action={action}
      method="get"
      role="search"
      autoComplete="off"
      spellCheck="false"
      className="group flex items-center gap-2 rounded-lg border border-slate-300 text-slate-700 shadow-sm transition focus-within:ring-2 focus-within:ring-brand-500 canopy-cmdk-form"
      onPointerDown={handlePointerDown}
      data-placeholder={placeholder || ''}
    >
      <label
        htmlFor={inputId}
        className="flex items-center gap-2 flex-1 min-w-0 cursor-text canopy-cmdk-label"
      >
        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 group-focus-within:text-brand-500 pointer-events-none" />
        <input
          id={inputId}
          type="search"
          name="q"
          inputMode="search"
          data-canopy-command-input
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none placeholder:text-slate-400 py-1 min-w-0"
          aria-label="Search"
          ref={inputRef}
        />
      </label>
      <button
        type="button"
        data-canopy-command-trigger
        className="inline-flex items-center gap-2 rounded-md border border-transparent bg-brand px-2 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <span>{text}</span>
        <span aria-hidden className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold canopy-cmdk-shortcut">
          <span>⌘</span>
          <span>K</span>
        </span>
      </button>
    </form>
  );
}
