export { HelloWorld } from "./src/HelloWorld.jsx";
export { default as Card } from "./src/layout/Card.jsx";
export { default as TextCard } from "./src/layout/TextCard.jsx";
export { default as Grid, GridItem } from "./src/layout/Grid.jsx";
export { default as CanopyHeader } from "./src/layout/CanopyHeader.jsx";
export { default as CanopyBrand } from "./src/layout/CanopyBrand.jsx";
export { default as CanopyModal } from "./src/layout/CanopyModal.jsx";
export { Viewer } from "./src/iiif/Viewer.jsx";
export { Slider } from "./src/iiif/Slider.jsx";
export { Scroll } from "./src/iiif/Scroll.jsx";
// New: RelatedItems placeholder (new data attribute)
export { default as RelatedItems } from "./src/iiif/MdxRelatedItems.jsx";
// Search UI (React)
export { default as SearchResults } from "./src/search/MdxSearchResults.jsx";
export { default as SearchSummary } from "./src/search/SearchSummary.jsx";
export { default as SearchTabs } from "./src/search/MdxSearchTabs.jsx";

export { default as SearchResultsUI } from "./src/search/SearchResults.jsx";
export { default as SearchTabsUI } from "./src/search/SearchTabs.jsx";
export { default as SearchFiltersDialog } from "./src/search/SearchFiltersDialog.jsx";
// Removed deprecated exports: useSearch, Search placeholder
// Search form modal placeholder (SSR-safe). Client runtime hydrates with the search form app.
export { default as SearchFormModal } from "./src/search-form/MdxSearchFormModal.jsx";
// Search panel (SSR-safe) and its parts
export { default as SearchPanel } from "./src/search/SearchPanel.jsx";
export { default as SearchPanelForm } from "./src/search/SearchPanelForm.jsx";
export { default as SearchPanelTeaserResults } from "./src/search/SearchPanelTeaserResults.jsx";
