const releases = [
  {
    "version": "1.6.22",
    "date": "2026-02-09",
    "summary": "Address theme and custom component bugs.",
    "highlights": []
  },
  {
    "version": "1.6.21",
    "date": "2026-02-06",
    "summary": "Normalize number defined height on ImageStory to CSS attribute string.",
    "highlights": []
  },
  {
    "version": "1.6.20",
    "date": "2026-02-06",
    "summary": "Integrate ImageStory into distributed package.",
    "highlights": []
  },
  {
    "version": "1.6.19",
    "date": "2026-02-06",
    "summary": "Introduce ImageStory component using Storiiies.",
    "highlights": []
  },
  {
    "version": "1.6.18",
    "date": "2026-02-05",
    "summary": "Introduce metadata Index component.",
    "highlights": []
  },
  {
    "version": "1.6.17",
    "date": "2026-02-04",
    "summary": "Exclude 404 from search index.",
    "highlights": []
  },
  {
    "version": "1.6.16",
    "date": "2026-02-04",
    "summary": "Hotfix: Address bug in Scroll component to render referenced annotations.",
    "highlights": []
  },
  {
    "version": "1.6.15",
    "date": "2026-02-03",
    "summary": "Hotfix: Address bug in Scroll component runtime compiler.",
    "highlights": []
  },
  {
    "version": "1.6.14",
    "date": "2026-02-03",
    "summary": "Update Scroll to support referenced annotation pages.",
    "highlights": []
  },
  {
    "version": "1.6.13",
    "date": "2026-02-02",
    "summary": "Add org release workflow.",
    "highlights": []
  },
  {
    "version": "1.6.12",
    "date": "2026-02-02",
    "summary": "Add support for referenced IIIF annotation pages.",
    "highlights": []
  },
  {
    "version": "1.6.11",
    "date": "2026-01-30",
    "summary": "Add primary navigation to works routes.",
    "highlights": []
  },
  {
    "version": "1.6.10",
    "date": "2026-01-30",
    "summary": "Add transparency to browser selection selector.",
    "highlights": []
  },
  {
    "version": "1.6.9",
    "date": "2026-01-30",
    "summary": "Simplify Clover theming for dark-mode compatibility.",
    "highlights": []
  },
  {
    "version": "1.6.8",
    "date": "2026-01-30",
    "summary": "Adjust z-index of map.",
    "highlights": []
  },
  {
    "version": "1.6.7",
    "date": "2026-01-27",
    "summary": "Update release workflow.",
    "highlights": []
  },
  {
    "version": "1.6.6",
    "date": "2026-01-27",
    "summary": "Patch copy button and address CSS-in-js syntax.",
    "highlights": []
  },
  {
    "version": "1.6.5",
    "date": "2026-01-27",
    "summary": "Refine collection language.",
    "highlights": []
  },
  {
    "version": "1.6.4",
    "date": "2026-01-26",
    "summary": "Simplify navigation.",
    "highlights": []
  },
  {
    "version": "1.6.3",
    "date": "2026-01-26",
    "summary": "Add 404 page route.",
    "highlights": []
  },
  {
    "version": "1.6.2",
    "date": "2026-01-26",
    "summary": "Fix title distillation on works and search screens.",
    "highlights": []
  },
  {
    "version": "1.6.1",
    "date": "2026-01-26",
    "summary": "Remove post-fetch cache rebuild.",
    "highlights": []
  },
  {
    "version": "1.6.0",
    "date": "2026-01-25",
    "summary": "Support direct IIIF Manifest aggregation.",
    "highlights": [
      "Add manifest property to configuration.",
      "Index manifests as results."
    ]
  },
  {
    "version": "1.5.17",
    "date": "2026-01-25",
    "summary": "Add search page title and description.",
    "highlights": []
  },
  {
    "version": "1.5.16",
    "date": "2026-01-25",
    "summary": "Add title property for global site name.",
    "highlights": []
  },
  {
    "version": "1.5.15",
    "date": "2026-01-25",
    "summary": "Refine content navigation UX.",
    "highlights": []
  },
  {
    "version": "1.5.14",
    "date": "2026-01-23",
    "summary": "Adjust Map marker math.",
    "highlights": []
  },
  {
    "version": "1.5.13",
    "date": "2026-01-23",
    "summary": "Simplify manifest referencing in Map and Timeline.",
    "highlights": []
  },
  {
    "version": "1.5.12",
    "date": "2026-01-23",
    "summary": "Style refinements.",
    "highlights": []
  },
  {
    "version": "1.5.11",
    "date": "2026-01-23",
    "summary": "Refine color contrast.",
    "highlights": []
  },
  {
    "version": "1.5.10",
    "date": "2026-01-23",
    "summary": "Normalize responsive navigation trees.",
    "highlights": []
  },
  {
    "version": "1.5.9",
    "date": "2026-01-21",
    "summary": "Improve accessibility with additional ARIA labels, screen reader announcements, and form label fixes.",
    "highlights": []
  },
  {
    "version": "1.5.8",
    "date": "2026-01-15",
    "summary": "Refine responsive menu and modal styling.",
    "highlights": []
  },
  {
    "version": "1.5.7",
    "date": "2026-01-14",
    "summary": "Define absolute canonical URLs for template.",
    "highlights": []
  },
  {
    "version": "1.5.6",
    "date": "2026-01-14",
    "summary": "Add canonical URLs to head.",
    "highlights": []
  },
  {
    "version": "1.5.5",
    "date": "2026-01-14",
    "summary": "Respect level0 IIIF images.",
    "highlights": []
  },
  {
    "version": "1.5.4",
    "date": "2026-01-13",
    "summary": "Revise release workflow.",
    "highlights": []
  },
  {
    "version": "1.5.3",
    "date": "2026-01-13",
    "summary": "Update release workflow.",
    "highlights": []
  },
  {
    "version": "1.5.2",
    "date": "2026-01-13",
    "summary": "Add styled blockquote.",
    "highlights": []
  },
  {
    "version": "1.5.1",
    "date": "2026-01-12",
    "summary": "Update Clover components to filter annotations.",
    "highlights": []
  },
  {
    "version": "1.5.0",
    "date": "2026-01-09",
    "summary": "Make build time more efficient.",
    "highlights": [
      "Set default build concurrency to 1",
      "Allow disabling of build concurrency",
      "Add phased telemetry for build times"
    ]
  },
  {
    "version": "1.4.17",
    "date": "2026-01-09",
    "summary": "Reset base collection.",
    "highlights": []
  },
  {
    "version": "1.4.16",
    "date": "2026-01-09",
    "summary": "Add fallback for thumbnails.",
    "highlights": []
  },
  {
    "version": "1.4.15",
    "date": "2026-01-08",
    "summary": "Refine button contrast accessibility.",
    "highlights": []
  },
  {
    "version": "1.4.14",
    "date": "2026-01-08",
    "summary": "Add canonical link in head.",
    "highlights": []
  },
  {
    "version": "1.4.13",
    "date": "2026-01-07",
    "summary": "Refine accessibility of theme colors.",
    "highlights": []
  },
  {
    "version": "1.4.12",
    "date": "2026-01-07",
    "summary": "Add ID to works and fix Bibliography misnomer.",
    "highlights": []
  },
  {
    "version": "1.4.11",
    "date": "2026-01-07",
    "summary": "Expose common base path helper.",
    "highlights": []
  },
  {
    "version": "1.4.10",
    "date": "2026-01-07",
    "summary": "Add StoryMapJS component example.",
    "highlights": []
  },
  {
    "version": "1.4.9",
    "date": "2026-01-07",
    "summary": "Address bad link in get started guide.",
    "highlights": []
  },
  {
    "version": "1.4.8",
    "date": "2026-01-07",
    "summary": "Introduce comprehenshive Bibliography component.",
    "highlights": []
  },
  {
    "version": "1.4.7",
    "date": "2026-01-06",
    "summary": "Add theme preview to docs.",
    "highlights": []
  },
  {
    "version": "1.4.6",
    "date": "2026-01-06",
    "summary": "Minor style updates and extend examples.",
    "highlights": []
  },
  {
    "version": "1.4.5",
    "date": "2026-01-06",
    "summary": "Hotfix: Remove unauthenticated tile layer from docs example.",
    "highlights": []
  },
  {
    "version": "1.4.4",
    "date": "2026-01-06",
    "summary": "Add component examples to template example page.",
    "highlights": []
  },
  {
    "version": "1.4.3",
    "date": "2026-01-05",
    "summary": "Address clean-up bug in MapPoint content.",
    "highlights": []
  },
  {
    "version": "1.4.2",
    "date": "2026-01-05",
    "summary": "Add referenced manifests cards to MapPoints.",
    "highlights": []
  },
  {
    "version": "1.4.1",
    "date": "2026-01-05",
    "summary": "Refine styling of Map markers.",
    "highlights": []
  },
  {
    "version": "1.4.0",
    "date": "2026-01-05",
    "summary": "Introduce Map component.",
    "highlights": [
      "Adds Map component using Leaflet",
      "Allow for navPlace features for IIIF resources",
      "Introduce MapPoint sub-component for defining manual points"
    ]
  },
  {
    "version": "1.3.6",
    "date": "2026-01-03",
    "summary": "Add .nojekyll marker and discontinue .xml aliasing.",
    "highlights": []
  },
  {
    "version": "1.3.5",
    "date": "2026-01-02",
    "summary": "Update Clover viewer to address multiple instances bug.",
    "highlights": []
  },
  {
    "version": "1.3.4",
    "date": "2026-01-02",
    "summary": "Apply responsive fixes to work layouts.",
    "highlights": []
  },
  {
    "version": "1.3.3",
    "date": "2025-12-30",
    "summary": "Regenerate clean lock files for templates.",
    "highlights": []
  },
  {
    "version": "1.3.2",
    "date": "2025-12-30",
    "summary": "Refine sitemaps to stem from index.",
    "highlights": []
  },
  {
    "version": "1.3.1",
    "date": "2025-12-23",
    "summary": "Normalize breadcrumb styling.",
    "highlights": []
  },
  {
    "version": "1.3.0",
    "date": "2025-12-23",
    "summary": "Resolve build issues with IIIF Presentation 2.x material.",
    "highlights": [
      "Resolves Presentation 2.x collections",
      "Normalizes and upgrades manifests to 3.0 `.cache`"
    ]
  },
  {
    "version": "1.2.9",
    "date": "2025-12-23",
    "summary": "Increase contrast of 50-level color steps",
    "highlights": []
  },
  {
    "version": "1.2.8",
    "date": "2025-12-23",
    "summary": "Style horizontal rules.",
    "highlights": []
  },
  {
    "version": "1.2.7",
    "date": "2025-12-23",
    "summary": "Update Viewer component docs.",
    "highlights": []
  },
  {
    "version": "1.2.6",
    "date": "2025-12-22",
    "summary": "Add search routes for defined metadata facets.",
    "highlights": []
  },
  {
    "version": "1.2.5",
    "date": "2025-12-22",
    "summary": "Adjust accent color step brightness and saturation.",
    "highlights": []
  },
  {
    "version": "1.2.4",
    "date": "2025-12-22",
    "summary": "Add GoogleAnalytics component and document SEO.",
    "highlights": []
  },
  {
    "version": "1.2.3",
    "date": "2025-12-22",
    "summary": "Add template workflow robots.txt rewrite.",
    "highlights": []
  },
  {
    "version": "1.2.2",
    "date": "2025-12-22",
    "summary": "Introduce sitemap.xml generation.",
    "highlights": []
  },
  {
    "version": "1.2.1",
    "date": "2025-12-22",
    "summary": "Add Clover to template update workflow.",
    "highlights": []
  },
  {
    "version": "1.2.0",
    "date": "2025-12-22",
    "summary": "Define custom components API.",
    "highlights": [
      "Add entry point at /app/components/mdx.tsx",
      "Define static and runtime workflows",
      "Document in developers section"
    ]
  },
  {
    "version": "1.1.1",
    "date": "2025-12-21",
    "summary": "Addresses bug in explicit References id assignment.",
    "highlights": []
  },
  {
    "version": "1.1.0",
    "date": "2025-12-21",
    "summary": "Make Clover IIIF shims more efficient through chunking.",
    "highlights": [
      "Updates Clover dependency to v3.1.1",
      "Adds chunking logic to slider, viewer, image, and scroll",
      "Reduces overall payload for components"
    ]
  },
  {
    "version": "1.0.3",
    "date": "2025-12-19",
    "summary": "Refine background color of show/hide content navigation button.",
    "highlights": []
  },
  {
    "version": "1.0.2",
    "date": "2025-12-19",
    "summary": "Refine range header styles on timeline component.",
    "highlights": []
  },
  {
    "version": "1.0.1",
    "date": "2025-12-19",
    "summary": "Workflow test run.",
    "highlights": []
  },
  {
    "version": "1.0.0",
    "date": "2025-12-19",
    "summary": "Initial public release of refactored Canopy.",
    "highlights": [
      "Creates @canopy-iiif/app release workflow",
      "IIIF ingestion for works/collections",
      "MDX authoring with SSR-safe components",
      "Allows multiple collections",
      "Removes Next.js dependencies",
      "Adds template generation"
    ]
  }
];
export default releases;
