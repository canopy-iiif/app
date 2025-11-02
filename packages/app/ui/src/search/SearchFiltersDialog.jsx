import React from "react";
import CanopyModal from "../layout/CanopyModal.jsx";

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
      className="canopy-search-filters__facet"
      open={hasSelection}
    >
      <summary className="canopy-search-filters__facet-summary">
        <span>{label}</span>
        <span className="canopy-search-filters__facet-count">
          {values.length}
        </span>
      </summary>
      <div className="canopy-search-filters__facet-content">
        <div className="canopy-search-filters__quick">
          <input
            type="search"
            value={quickQuery}
            onChange={(event) => setQuickQuery(event.target.value)}
            placeholder="Search values"
            className="canopy-search-filters__quick-input"
            aria-label={`Filter ${label} values`}
          />
          {quickQuery ? (
            <button
              type="button"
              onClick={() => setQuickQuery("")}
              className="canopy-search-filters__quick-clear"
            >
              Clear
            </button>
          ) : null}
        </div>
        {hasQuery && !filteredValues.length ? (
          <p className="canopy-search-filters__facet-notice">No matches found.</p>
        ) : null}
        <ul className="canopy-search-filters__facet-list">
          {filteredValues.map((entry) => {
            const valueSlug = String(entry.slug || entry.value || "");
            const isChecked = selectedValues.has(valueSlug);
            const inputId = checkboxId(valueSlug);
            return (
              <li key={valueSlug} className="canopy-search-filters__facet-item">
                <input
                  id={inputId}
                  type="checkbox"
                  className="canopy-search-filters__facet-checkbox"
                  checked={isChecked}
                  onChange={(event) => {
                    const nextChecked = !!event.target.checked;
                    if (onToggle) onToggle(slug, valueSlug, nextChecked);
                  }}
                />
                <label
                  htmlFor={inputId}
                  className="canopy-search-filters__facet-label"
                >
                  <span>
                    {entry.value}{" "}
                    {Number.isFinite(entry.doc_count) ? (
                      <span className="canopy-search-filters__facet-count">
                        ({entry.doc_count})
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
          {!filteredValues.length && !hasQuery ? (
            <li className="canopy-search-filters__facet-empty">No values available.</li>
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
    title,
    subtitle = "Refine results by metadata",
    brandLabel = "Canopy IIIF",
    brandHref = "/",
    logo: SiteLogo,
  } = props;

  const selectedMap = normalizeSelected(selected);
  const activeCount = Array.from(selectedMap.values()).reduce(
    (total, set) => total + set.size,
    0
  );

  React.useEffect(() => {
    if (!open) return undefined;
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    const root = document.documentElement;
    const prevBody = body ? body.style.overflow : "";
    const prevRoot = root ? root.style.overflow : "";
    if (body) body.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      if (body) body.style.overflow = prevBody;
      if (root) root.style.overflow = prevRoot;
    };
  }, [open]);

  if (!open) return null;

  const brandId = "canopy-modal-filters-label";
  const subtitleText = subtitle != null ? subtitle : title;

  return (
    <CanopyModal
      id="canopy-modal-filters"
      variant="filters"
      open
      labelledBy={brandId}
      label={brandLabel}
      logo={SiteLogo}
      href={brandHref}
      closeLabel="Close filters"
      onClose={() => onOpenChange && onOpenChange(false)}
      onBackgroundClick={() => onOpenChange && onOpenChange(false)}
      bodyClassName="canopy-modal__body--filters"
    >
      {subtitleText ? (
        <p className="canopy-search-filters__subtitle">{subtitleText}</p>
      ) : null}
      <div className="canopy-search-filters__body">
        {Array.isArray(facets) && facets.length ? (
          <div className="canopy-search-filters__facets">
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
          <p className="canopy-search-filters__empty">
            No filters are available for this collection.
          </p>
        )}
      </div>
      <footer className="canopy-search-filters__footer">
        <div>
          {activeCount
            ? `${activeCount} filter${activeCount === 1 ? '' : 's'} applied`
            : 'No filters applied'}
        </div>
        <div className="canopy-search-filters__footer-actions">
          <button
            type="button"
            onClick={() => {
              if (onClear) onClear();
            }}
            disabled={!activeCount}
            className="canopy-search-filters__button canopy-search-filters__button--secondary"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => onOpenChange && onOpenChange(false)}
            className="canopy-search-filters__button canopy-search-filters__button--primary"
          >
            Done
          </button>
        </div>
      </footer>
    </CanopyModal>
  );
}
