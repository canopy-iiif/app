export { HelloWorld } from "./src/HelloWorld.jsx";
export { Viewer } from "./src/iiif/Viewer.jsx";
export { Slider } from "./src/iiif/Slider.jsx";
export { Scroll } from "./src/iiif/Scroll.jsx";
// New: RelatedItems placeholder (SSR-safe)
export { default as RelatedItems } from "./src/iiif/MdxRelatedItems.jsx";
// SSR-only Hero (includes featured selection via helpers)
export { default as Hero } from "./src/iiif/Hero.jsx";
export { default as FeaturedHero } from "./src/iiif/FeaturedHero.jsx";
export { default as SubNavigation } from "./src/layout/SubNavigation.jsx";

// SSR-safe MDX placeholders (do not import browser-only UI here)
export { default as SearchResults } from "./src/search/MdxSearchResults.jsx";
export { default as SearchSummary } from "./src/search/SearchSummary.jsx";
export { default as SearchTabs } from "./src/search/MdxSearchTabs.jsx";

// Search form modal (SSR-safe placeholder). Client app not exported to avoid optional deps.
export { default as SearchFormModal } from "./src/search-form/MdxSearchFormModal.jsx";
// Search panel (SSR-safe) and its parts for SSR/MDX usage
export { default as SearchPanel } from "./src/search/SearchPanel.jsx";
export { default as SearchPanelForm } from "./src/search/SearchPanelForm.jsx";
export { default as SearchPanelTeaserResults } from "./src/search/SearchPanelTeaserResults.jsx";

// Clover IIIF primitives wrappers for SSR rendering
export {
  Label,
  Metadata,
  RequiredStatement,
  Summary,
} from "./src/iiif/ManifestPrimitives.jsx";
