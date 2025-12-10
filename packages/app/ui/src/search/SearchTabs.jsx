import React, {useRef, useState, useEffect} from "react";

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

  // --- highlight state (ported from RadioGroup idea) ---
  const [itemBoundingBox, setItemBoundingBox] = useState(null);
  const [wrapperBoundingBox, setWrapperBoundingBox] = useState(null);
  const [highlightedTab, setHighlightedTab] = useState(null);
  const [isHoveredFromNull, setIsHoveredFromNull] = useState(true);

  const wrapperRef = useRef(null);
  const highlightRef = useRef(null);

  const repositionHighlight = (e, tabKey) => {
    if (!tabKey || !wrapperRef.current) return;

    // use currentTarget so we get the <button>, not the inner text node
    const item = e.currentTarget;
    setItemBoundingBox(item.getBoundingClientRect());
    setWrapperBoundingBox(wrapperRef.current.getBoundingClientRect());
    setIsHoveredFromNull(!highlightedTab);
    setHighlightedTab(tabKey);
  };

  const resetHighlight = () => {
    setHighlightedTab(null);
  };

  // Optional: snap highlight to the active tab when `type` changes
  useEffect(() => {
    if (!wrapperRef.current) return;
    const activeButton = wrapperRef.current.querySelector(
      `button[data-tab-value="${type}"]`
    );
    if (!activeButton) return;

    const itemBox = activeButton.getBoundingClientRect();
    const wrapperBox = wrapperRef.current.getBoundingClientRect();

    setItemBoundingBox(itemBox);
    setWrapperBoundingBox(wrapperBox);
    setIsHoveredFromNull(true);
    setHighlightedTab(type);
  }, [type]);

  let highlightStyles = {};
  if (itemBoundingBox && wrapperBoundingBox) {
    highlightStyles = {
      opacity: highlightedTab ? 1 : 0,
      transform: `translateX(${itemBoundingBox.left - wrapperBoundingBox.left}px)`,
      transitionDuration: isHoveredFromNull ? "0ms" : "200ms",
      width: `${itemBoundingBox.width}px`,
    };
  }

  return (
    <div className="canopy-search-tabs-wrapper">
      <div
        role="tablist"
        aria-label="Search types"
        className="canopy-search-tabs"
        ref={wrapperRef}
        onMouseLeave={resetHighlight}
      >
        {/* moving highlight */}
        <div
          ref={highlightRef}
          className="canopy-search-tabs__highlight"
          style={highlightStyles}
        />

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
              data-tab-value={t}
              onClick={() => onTypeChange && onTypeChange(t)}
              onMouseOver={(e) => repositionHighlight(e, t)}
              className={`canopy-search-tab ${active ? "is-active" : ""}`}
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
