import React from "react";

export default function SearchPanelForm(props = {}) {
  const {
    placeholder = "Search…",
    buttonLabel = "Search",
    label,
    searchPath = "/search",
  } = props || {};

  const text =
    typeof label === "string" && label.trim() ? label.trim() : buttonLabel;

  return (
    <form
      action={searchPath}
      method="get"
      role="search"
      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-300 bg-white/95 backdrop-blur text-slate-700 shadow-sm hover:shadow transition w-full focus-within:ring-2 focus-within:ring-brand-500"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4 text-slate-500"
      >
        <path
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m19 19-4-4m-2.5-6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        />
      </svg>
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
