import React from "react";

export default function SearchTabs({
  type = "all",
  onTypeChange,
  types = [],
  counts = {},
  onOpenFilters,
  activeFilterCount = 0,
  filtersLabel = "Filters",
  filtersOpen = false,
}) {
  const orderedTypes = Array.isArray(types) ? types : [];
  const toLabel = (t) =>
    t && t.length ? t.charAt(0).toUpperCase() + t.slice(1) : "";
  const hasFilters = typeof onOpenFilters === "function";
  const filterBadge = activeFilterCount > 0 ? ` (${activeFilterCount})` : "";
  return (
    <div className="canopy-search-tabs-wrapper">
      <div
        role="tablist"
        aria-label="Search types"
        className="canopy-search-tabs"
      >
        {orderedTypes.map((t) => {
          const active = String(type).toLowerCase() === String(t).toLowerCase();
          const cRaw =
            counts && Object.prototype.hasOwnProperty.call(counts, t)
              ? counts[t]
              : undefined;
          const c = Number.isFinite(Number(cRaw)) ? Number(cRaw) : 0;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onTypeChange && onTypeChange(t)}
            >
              {toLabel(t)} ({c})
            </button>
          );
        })}
      </div>
      {hasFilters ? (
        <button
          type="button"
          onClick={() => onOpenFilters && onOpenFilters()}
          aria-expanded={filtersOpen ? "true" : "false"}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
        >
          <span>
            {filtersLabel}
            {filterBadge}
          </span>
        </button>
      ) : null}
    </div>
  );
}
