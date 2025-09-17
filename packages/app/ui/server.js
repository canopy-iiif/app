export { Fallback } from "./src/Fallback.jsx";
export { HelloWorld } from "./src/HelloWorld.jsx";
export { Viewer } from "./src/iiif/Viewer.jsx";
export { Slider } from "./src/iiif/Slider.jsx";
// New: RelatedItems placeholder (SSR-safe)
export { default as RelatedItems } from "./src/iiif/MdxRelatedItems.jsx";

// SSR-safe MDX placeholders (do not import browser-only UI here)
export { default as SearchForm } from "./src/search/MdxSearchForm.jsx";
export { default as SearchResults } from "./src/search/MdxSearchResults.jsx";
export { default as SearchSummary } from "./src/search/SearchSummary.jsx";
export { default as SearchTotal } from "./src/search/SearchTotal.jsx";

// Command palette (SSR-safe placeholder). Client app not exported to avoid optional deps.
export { default as CommandPalette } from "./src/command/MdxCommandPalette.jsx";
