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
  } = props || {};

  const text =
    typeof label === "string" && label.trim() ? label.trim() : buttonLabel;
  const action = React.useMemo(
    () => resolveSearchPath(searchPath),
    [searchPath]
  );

  return (
    <form
      action={action}
      method="get"
      role="search"
      autoComplete="off"
      spellCheck="false"
      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-300 bg-white/95 backdrop-blur text-slate-700 shadow-sm hover:shadow transition w-full focus-within:ring-2 focus-within:ring-brand-500"
    >
      <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 group-focus-within:text-brand-500" />
      <input
        type="search"
        name="q"
        inputMode="search"
        data-canopy-command-input
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-slate-400 py-0.5 min-w-0"
        aria-label="Search"
      />
      <button
        type="submit"
        data-canopy-command-link
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
      >
        <span>{text}</span>
      </button>
    </form>
  );
}
