# Canopy IIIF (Work in Progress)

[![Deploy to GitHub Pages](https://github.com/canopy-iiif/app/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/canopy-iiif/app/actions/workflows/deploy-pages.yml)

Static site generator powered by MDX and IIIF. The stable app entry at `app/scripts/canopy-build.mjs` orchestrates UI assets and calls the library to build from `content/` into `site/`.

## Quick Start

- Install: `npm install`
- Develop: `npm run dev` (serves `http://localhost:3000`)
- Build: `npm run build`

Entrypoint details

- Both commands run `node app/scripts/canopy-build.mjs`.
- Dev mode starts the UI watcher (`@canopy-iiif/app` → `ui:watch`) and the dev server from `@canopy-iiif/app`.
- Build mode builds the UI once, then runs the site build from `@canopy-iiif/app`.

## Content Tree

```
content/
  _layout.mdx          # optional: site-wide layout wrapper
  _styles.css          # optional: site-wide CSS copied to site/styles.css
  index.mdx            # homepage → site/index.html
  sitemap.mdx          # sitemap page (receives props.pages) → site/sitemap.html
  docs/
    getting-started.mdx
    guide.mdx
  works/
    _layout.mdx        # layout for IIIF manifests (receives props.manifest)
```

Build output goes to `site/`. Development cache lives in `.cache/`:

- `.cache/mdx`: transient compiled MDX modules used to render MDX/JSX.
- `.cache/iiif`: IIIF cache used by the builder:
  - `index.json`: primary index storing `byId` (Collection/Manifest ids to slugs) and `collection` metadata (uri, hash, updatedAt).
  - `manifests/{slug}.json`: cached, normalized Manifest JSON per work page.
  - Legacy files like `manifest-index.json` may be removed as part of migrations.
  - Clear this cache by deleting `.cache/iiif/` if you need a fresh fetch.

## Assets

Place static files under `assets/` and they will be copied to the site root, preserving subpaths. For example:

- `assets/images/example.jpg` → `site/images/example.jpg`
- `assets/downloads/file.pdf` → `site/downloads/file.pdf`

## Development

- Run `npm run dev` to start a local server at `http://localhost:3000` with live reload.
- Editing MDX under `content/` triggers a site rebuild and automatic browser reload.
- Editing files under `assets/` copies only the changed files into `site/` (no full rebuild) and reloads the browser.

## Tailwind (Canopy IIIF UI)

Canopy ships a small Tailwind preset and plugin so you can opt into sensible defaults with semantic CSS, or disable them entirely.

- Preset (tokens + plugin): `@canopy-iiif/app/ui/canopy-iiif-preset`
- Plugin (component CSS only): `@canopy-iiif/app/ui/canopy-iiif-plugin`

Defaults (recommended) — enabled in `app/styles/tailwind.config.js`:

```js
// app/styles/tailwind.config.js
module.exports = {
  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],
  content: [
    './content/**/*.{mdx,html}',
    './site/**/*.html',
    './packages/app/ui/**/*.{js,jsx,ts,tsx}',
    './packages/app/lib/components/**/*.{js,jsx}',
  ],
  theme: { extend: {} },
  // You can also include the plugin explicitly (already included by the preset)
  plugins: [require('@canopy-iiif/app/ui/canopy-iiif-plugin')],
};
```

Notes

- Disable Canopy’s component styles by removing the plugin line.
- Replace the preset if you want to define your own tokens (colors/fonts/sizing) and keep only the plugin.
- The UI components use clear, semantic selectors (e.g., `.canopy-card`). You can override these in your own Tailwind layers if desired.
- In dev, CSS changes hot‑swap without a full page reload (Tailwind, `app/styles/**`, and the Canopy UI plugin/preset).

## IIIF Build

- Layout: add `content/works/_layout.mdx` to enable IIIF work page generation. The layout receives `props.manifest` (normalized to Presentation 3).
- Source: collection URI comes from `canopy.yml` (`collection.uri`) or `CANOPY_COLLECTION_URI` env var.
- Behavior:
  - Recursively walks the collection and subcollections, fetching Manifests.
  - Normalizes resources using `@iiif/helpers` to v3 where possible.
  - Caches fetched Manifests in `.cache/iiif/manifests/` and tracks ids/slugs in `.cache/iiif/index.json`.
  - Emits one HTML page per Manifest under `site/works/<slug>.html`.
- Performance: tune with `iiif.chunkSize` and `iiif.concurrency` in `canopy.yml` or via env `CANOPY_CHUNK_SIZE` and `CANOPY_FETCH_CONCURRENCY`.
- Cache notes: switching `collection.uri` resets the manifest cache; you can also delete `.cache/iiif/` to force a refetch.

### Facet Collections (from IIIF metadata)

Canopy can derive new IIIF Presentation 3 Collections from a single source Collection by faceting on Manifest metadata labels you choose.

- Configure labels in `canopy.yml`:
  - `metadata: ["Date", "Subject", "Creator"]` (case-sensitive label match).
- Aggregation: during the build, Canopy scans each Manifest’s `metadata[]` and collects values (across all languages) for the configured labels.
  - Internal cache: `.cache/iiif/facets.json` (implementation detail; not served).
- Output (IIIF-only API under `site/api/facet/**`):
  - `/api/facet/index.json`: top-level IIIF Collection listing all facet labels.
  - `/api/facet/{label}.json`: IIIF Collection of child value Collections for that label.
  - `/api/facet/{label}/{value}.json`: IIIF Collection of Manifests that have that label/value.
  - All `id` fields are absolute URLs (see Base URL notes below).
- Items included in value Collections:
  - `id`: Manifest URI (IIIF Presentation URL for the work)
  - `type`: `Manifest`
  - `label`: `{ none: [title] }`
  - `thumbnail`: optional, `{ id, type: 'Image' }`
  - `homepage`: site page for the work (absolute URL), typed as `Text`

Base URL rules for IIIF ids

- Absolute ids/links use this priority:
  1) GitHub Actions: auto‑detected in the Pages workflow (`owner.github.io[/repo]`).
  2) `CANOPY_BASE_URL` env var (e.g., `https://canopy-iiif.github.io/canopy-iiif`).
  3) `canopy.yml` → `site.baseUrl`.
  4) Dev default `http://localhost:3000` (or `PORT` env).

Why this is cool

- From a single IIIF Collection, Canopy synthesizes many new IIIF-compliant Collections (one per facet label, plus one per label/value). These can be browsed, linked to, and reused by external tools that speak the IIIF Presentation API.

### Thumbnails

- Config keys (in `canopy.yml` under `iiif.thumbnails`):
  - `unsafe` (boolean, default `false`): when `true`, uses an expanded strategy that may perform extra requests to find a representative image.
  - `preferredSize` (number, default `1200`): target width/height in pixels when selecting a thumbnail.
- Behavior: during the IIIF build, a thumbnail URL is resolved for each Manifest and stored on its entry in `.cache/iiif/index.json` as `thumbnail`.
- Safety: with `unsafe: false`, a simpler/safer selection is used; with `unsafe: true`, the helper may probe additional sources to find a better image at the requested size.
- Current project setting: `preferredSize: 400`.

## Interactive Components (SSR + Hydration)

Two interactive areas are available out of the box and render safely in MDX:

- Viewer: `<Viewer iiifContent="…" />` — wraps `@samvera/clover-iiif` and hydrates client‑side.
- Slider: `<Slider iiifContent="…" />` — wraps Clover’s slider; hydrates client‑side via a separate bundle.
- Search (composable): place any of these where you want on the page and they hydrate client‑side:
  - `<SearchSummary />` — summary text (query/type aware)
  - `<SearchResults />` — results list
  - `<SearchTabs />` — type tabs (e.g., work/pages/docs)
  - `<RelatedItems top={3} iiifContent?="…" />` — related item sliders (facet‑driven)
    - Without `iiifContent` (e.g., homepage): picks one top value per indexed facet label and renders one slider per label.
    - With `iiifContent` (work pages): reads the Manifest’s metadata, intersects with indexed facets, then picks one of the Manifest’s values at random for each label and renders exactly one slider per label. Facets not present on the Manifest are skipped.

How it works:

- MDX is rendered on the server. Browser‑only components emit a lightweight placeholder element.
- The build injects `site/scripts/react-globals.js` and the relevant hydration script(s) into pages that need them.
- On load, the hydration script finds placeholders, reads props (embedded as JSON), and mounts the React component.
  - Viewer runtime: `site/scripts/canopy-viewer.js`
  - Slider runtime: `site/scripts/canopy-slider.js` (loaded only on pages that include `<Slider />`)
  - Related items runtime: `site/scripts/canopy-related-items.js` (loaded only on pages that include `<RelatedItems />`)

Usage examples:

```
// content/index.mdx
## Demo
<Viewer iiifContent="https://api.dc.library.northwestern.edu/api/v2/works/…?as=iiif" />

// content/search/_layout.mdx
# Search
<SearchTabs />
<SearchSummary />
<SearchResults />
```

Notes:

- You do not need to import components in MDX; they are auto‑provided by the MDX provider from `@canopy-iiif/ui`.
- The Viewer and Search placeholders render minimal HTML on the server and hydrate in the browser.
- The search runtime (`site/search.js`) uses FlexSearch and supports filtering by `type` (e.g., `work`, `page`, `docs`). These subcomponents share a single client store so they stay in sync.

### Search Results Layout (Grid vs List)

- `@canopy-iiif/ui` exposes a Masonry `Grid` used by `SearchResults`.
- You can control the layout via a prop on the MDX placeholder:
  - `<SearchResults layout="grid" />` (default)
  - `<SearchResults layout="list" />`
- The Grid is implemented with `react-masonry-css` and scoped styles; it renders columns client‑side after hydration.

SSR safety and bundling

- Server render imports UI from `@canopy-iiif/ui/server` — a server‑safe entry that only exports MDX placeholders and other SSR‑compatible components.
- Browser UI (`@canopy-iiif/ui`) is built as an ESM library with externals for heavy globals:
  - Externals: `react`, `react-dom`, `react-dom/client`, `react-masonry-css`, `flexsearch`.
- The search runtime bundles the client UI, and provides shims so those externals resolve to browser globals:
  - React shims come from `site/scripts/react-globals.js` (injected when needed).
  - FlexSearch is also shimmed to `window.FlexSearch` in the runtime bundle.

Advanced layout (optional, future):

- If you need full control over the search page layout, we'll expose a composable Search API (slots or render props) so you can place the form, summary, and results anywhere. Until then, `<Search />` renders a sensible default.

Dot‑notation (future): we may also expose these as `<Search.Form />`, `<Search.Results />`, `<Search.Summary />`, `<Search.Total />` if needed.

## Deploy to GitHub Pages

- Workflow: `.github/workflows/deploy-pages.yml` builds `site/` and deploys to Pages.
- Enable Pages: in repository Settings → Pages → set Source to "GitHub Actions" (or use the workflow’s automatic enablement if allowed).
- Trigger: pushes to `main` (or run manually via Actions → "Deploy to GitHub Pages").
- Output: the workflow uploads the `site/` folder as the Pages artifact and deploys it.

<!-- PAGES_URL_END -->

- CI tuning (optional):
  - `canopy.yml` → `iiif.chunkSize`, `iiif.concurrency` to control fetch/build parallelism.
  - Env overrides (in workflow): `CANOPY_CHUNK_SIZE`, `CANOPY_FETCH_CONCURRENCY`, and `CANOPY_COLLECTION_URI` (use a small collection for faster CI).
- Project Pages base path: links currently use absolute `/…`. If deploying under `/<repo>` you may want base‑path aware links; open an issue if you want this wired in.

## Template Workflow

- This repository (`app`) maintains a separate template repository (`template`).
- On push to `main`, `.github/workflows/release-and-template.yml` publishes packages and, when a publish occurs, builds a clean template and force‑pushes it to `canopy-iiif/template` (branch `main`).
- The workflow:
  - Excludes dev‑only paths (`.git`, `node_modules`, `packages`, `.cache`, `.changeset`, internal workflows/docs).
  - Rewrites `package.json` to remove workspaces and depend on published `@canopy-iiif/lib`/`@canopy-iiif/ui` versions; sets `build`/`dev` scripts to run `node app/scripts/canopy-build.mjs`.
  - Patches the template’s deploy workflow to include an inline “verify HTML generated” step.
- Setup:
  - Create the `template` repo under the `canopy-iiif` org (or your chosen owner) and add a `TEMPLATE_PUSH_TOKEN` secret (PAT with repo write access) to this repo’s secrets.
  - Optionally mark `template` as a Template repository so users can click “Use this template”.

## Contributing

See `CONTRIBUTING.md` for repository structure, versioning with Changesets, release flow, and the template-branch workflow.

**Troubleshooting**
- Dynamic require error: if you see “Dynamic require of 'react' is not supported” in the browser, ensure the UI build treats `react`, `react-dom`, `react-dom/client`, `react-masonry-css`, and `flexsearch` as externals. The search runtime supplies React and FlexSearch globals and shims imports to `window.React*`/`window.FlexSearch`.
- SSR import safety: the server should import UI via `@canopy-iiif/ui/server` to avoid pulling browser‑only code (like the Masonry Grid) during MDX SSR.
- No columns rendering: if Masonry renders a single row, verify that the DOM includes `.canopy-grid_column` wrappers. If not, the Masonry lib likely failed to load; check the build externals and that `site/scripts/react-globals.js` is injected on the page (it is when interactive components are present).
