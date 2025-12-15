export { HelloWorld } from "./src/HelloWorld.jsx";
export { Viewer } from "./src/iiif/Viewer.jsx";
export { Slider } from "./src/iiif/Slider.jsx";
export { Scroll } from "./src/iiif/Scroll.jsx";
export { Image } from "./src/iiif/Image.jsx";
// New: RelatedItems placeholder (SSR-safe)
export { default as RelatedItems } from "./src/iiif/MdxRelatedItems.jsx";
// Hero interstitials supersede the legacy Hero component.
export * as Interstitials from "./src/interstitials/index.js";
export { default as SubNavigation } from "./src/layout/SubNavigation.jsx";
export { default as Layout } from "./src/layout/Layout.jsx";
export { default as CanopyHeader } from "./src/layout/CanopyHeader.jsx";
export { default as CanopyFooter } from "./src/layout/CanopyFooter.jsx";
export { default as CanopyBrand } from "./src/layout/CanopyBrand.jsx";
export { default as CanopyModal } from "./src/layout/CanopyModal.jsx";
export { default as Container } from "./src/layout/Container.jsx";
export { default as Button } from "./src/layout/Button.jsx";
export { default as ButtonWrapper } from "./src/layout/ButtonWrapper.jsx";
export { default as ReferencedItems } from "./src/content/ReferencedItems.jsx";
export { default as References } from "./src/content/References.jsx";

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

// Docs helpers
export { default as DocsCodeBlock } from "./src/docs/CodeBlock.jsx";
export { default as DocsMarkdownTable } from "./src/docs/MarkdownTable.jsx";
export { CanopyDiagram } from "./src/docs/Diagram.jsx";
export { default as ThemeShowcase } from "./src/docs/ThemeShowcase.jsx";
