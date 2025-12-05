import React from "react";

// SSR placeholder for teaser results panel; the runtime controls visibility and content.
export default function SearchPanelTeaserResults(props = {}) {
  const { style, className } = props || {};
  const classes = ["canopy-search-teaser", "is-empty", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-canopy-search-form-panel
      hidden
      className={classes || undefined}
      style={style}
    >
      <div id="cplist" className="canopy-search-teaser__list" />
    </div>
  );
}
