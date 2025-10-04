import React from "react";

function toArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return [input];
}

function normalizeSelected(selected = {}) {
  const map = new Map();
  if (selected && typeof selected === "object") {
    Object.keys(selected).forEach((key) => {
      const vals = new Set(toArray(selected[key]).map((v) => String(v)));
      if (vals.size) map.set(String(key), vals);
    });
  }
  return map;
}

function facetMatches(values = [], query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return values;
  const starts = [];
  const contains = [];
  values.forEach((entry) => {
    if (!entry || !entry.value) return;
    const value = String(entry.value);
    const slug = String(entry.slug || entry.value || "");
    const match = value.toLowerCase();
    if (match.startsWith(q))
      starts.push({value, slug, doc_count: entry.doc_count});
    else if (match.includes(q))
      contains.push({value, slug, doc_count: entry.doc_count});
  });
  return [...starts, ...contains].slice(0, 10);
}

function FacetSection({facet, selected, onToggle}) {
  if (!facet || !facet.label || !Array.isArray(facet.values)) return null;
  const {label, slug, values} = facet;
  const selectedValues = selected.get(String(slug)) || new Set();
  const checkboxId = (valueSlug) => `filter-${slug}-${valueSlug}`;
  const hasSelection = selectedValues.size > 0;
  const [quickQuery, setQuickQuery] = React.useState("");
  const hasQuery = quickQuery.trim().length > 0;
  const filteredValues = React.useMemo(
    () => facetMatches(values, quickQuery),
    [values, quickQuery]
  );

  return (
    <details
      className="rounded-lg border border-slate-200 bg-slate-50"
      open={hasSelection}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-900">
        <span>{label}</span>
        <span className="text-xs font-normal text-slate-500">
          {values.length}
        </span>
      </summary>
      <div className="max-h-60 overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <div className="mb-3 flex items-center gap-2">
          <input
            type="search"
            value={quickQuery}
            onChange={(event) => setQuickQuery(event.target.value)}
            placeholder="Search values"
            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label={`Filter ${label} values`}
          />
          {quickQuery ? (
            <button
              type="button"
              onClick={() => setQuickQuery("")}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
            >
              Clear
            </button>
          ) : null}
        </div>
        {hasQuery && !filteredValues.length ? (
          <p className="mb-3 text-xs text-slate-400">No matches found.</p>
        ) : null}
        <ul className="space-y-2" style={{padding: 0}}>
          {filteredValues.map((entry) => {
            const valueSlug = String(entry.slug || entry.value || "");
            const isChecked = selectedValues.has(valueSlug);
            const inputId = checkboxId(valueSlug);
            return (
              <li key={valueSlug} className="flex items-start gap-2">
                <input
                  id={inputId}
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  checked={isChecked}
                  onChange={(event) => {
                    const nextChecked = !!event.target.checked;
                    if (onToggle) onToggle(slug, valueSlug, nextChecked);
                  }}
                />
                <label
                  htmlFor={inputId}
                  className="flex flex-1 flex-col gap-0.5"
                >
                  <span>
                    {entry.value}{" "}
                    {Number.isFinite(entry.doc_count) ? (
                      <span className="text-xs text-slate-500">
                        ({entry.doc_count})
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
          {!filteredValues.length && !hasQuery ? (
            <li className="text-xs text-slate-400">No values available.</li>
          ) : null}
        </ul>
      </div>
    </details>
  );
}

export default function SearchFiltersDialog(props = {}) {
  const {
    open = false,
    onOpenChange,
    facets = [],
    selected = {},
    onToggle,
    onClear,
    title = "Filters",
    subtitle = "Refine results by metadata",
  } = props;

  const selectedMap = normalizeSelected(selected);
  const activeCount = Array.from(selectedMap.values()).reduce(
    (total, set) => total + set.size,
    0
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 px-4 py-8"
      onClick={(event) => {
        if (event.target === event.currentTarget && onOpenChange)
          onOpenChange(false);
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange && onOpenChange(false)}
            className="rounded-md border border-transparent px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Close
          </button>
        </header>
        <div className="grid gap-4 px-6 py-6">
          {Array.isArray(facets) && facets.length ? (
            <div className="space-y-3">
              {facets.map((facet) => (
                <FacetSection
                  key={facet.slug || facet.label}
                  facet={facet}
                  selected={selectedMap}
                  onToggle={onToggle}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No filters are available for this collection.
            </p>
          )}
        </div>
        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <div className="text-sm text-slate-500">
            {activeCount
              ? `${activeCount} filter${activeCount === 1 ? "" : "s"} applied`
              : "No filters applied"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onClear) onClear();
              }}
              disabled={!activeCount}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition disabled:cursor-not-allowed disabled:text-slate-400 hover:bg-slate-100"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => onOpenChange && onOpenChange(false)}
              className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
