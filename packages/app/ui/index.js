export { Fallback } from "./src/Fallback.jsx";
export { HelloWorld } from "./src/HelloWorld.jsx";
export { default as Card } from "./src/layout/Card.jsx";
export { default as Grid, GridItem } from "./src/layout/Grid.jsx";
export { Viewer } from "./src/iiif/Viewer.jsx";
export { Slider } from "./src/iiif/Slider.jsx";
// New: RelatedItems placeholder (new data attribute)
export { default as RelatedItems } from "./src/iiif/MdxRelatedItems.jsx";
// Note: Hero is SSR-only; exported from ./server.js, not the browser build.
// Search UI (React)
// MDX placeholders (SSR-safe). Runtime mounts real components.
export { default as SearchForm } from "./src/search/MdxSearchForm.jsx";
export { default as SearchResults } from "./src/search/MdxSearchResults.jsx";
export { default as SearchSummary } from "./src/search/SearchSummary.jsx";
export { default as SearchTotal } from "./src/search/SearchTotal.jsx";
export { default as SearchTabs } from "./src/search/MdxSearchTabs.jsx";

// Internal UI components for runtime (not mapped into MDX)
export { default as SearchFormUI } from "./src/search/SearchForm.jsx";
export { default as SearchResultsUI } from "./src/search/SearchResults.jsx";
export { default as SearchTabsUI } from "./src/search/SearchTabs.jsx";
export { useSearch } from "./src/search/useSearch.js";
export { default as Search } from "./src/search/Search.jsx";
// Command palette placeholder (SSR-safe). Client runtime uses a lightweight fallback.
export { default as CommandPalette } from "./src/command/MdxCommandPalette.jsx";
// Search panel (SSR-safe) and its parts
export { default as SearchPanel } from "./src/search/SearchPanel.jsx";
export { default as SearchPanelForm } from "./src/search/SearchPanelForm.jsx";
export { default as SearchPanelTeaserResults } from "./src/search/SearchPanelTeaserResults.jsx";
