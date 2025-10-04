export { HelloWorld } from "./src/HelloWorld.jsx";
export { default as Card } from "./src/layout/Card.jsx";
export { default as Grid, GridItem } from "./src/layout/Grid.jsx";
export { Viewer } from "./src/iiif/Viewer.jsx";
export { Slider } from "./src/iiif/Slider.jsx";
// New: RelatedItems placeholder (new data attribute)
export { default as RelatedItems } from "./src/iiif/MdxRelatedItems.jsx";
// Note: Hero is SSR-only; exported from ./server.js, not the browser build.
// Search UI (React)
export { default as SearchResults } from "./src/search/MdxSearchResults.jsx";
export { default as SearchSummary } from "./src/search/SearchSummary.jsx";
export { default as SearchTabs } from "./src/search/MdxSearchTabs.jsx";

export { default as SearchResultsUI } from "./src/search/SearchResults.jsx";
export { default as SearchTabsUI } from "./src/search/SearchTabs.jsx";
export { default as SearchFiltersDialog } from "./src/search/SearchFiltersDialog.jsx";
// Removed deprecated exports: useSearch, Search placeholder
// Command palette placeholder (SSR-safe). Client runtime hydrates with the search command app.
export { default as CommandPalette } from "./src/command/MdxCommandPalette.jsx";
// Search panel (SSR-safe) and its parts
export { default as SearchPanel } from "./src/search/SearchPanel.jsx";
export { default as SearchPanelForm } from "./src/search/SearchPanelForm.jsx";
export { default as SearchPanelTeaserResults } from "./src/search/SearchPanelTeaserResults.jsx";
