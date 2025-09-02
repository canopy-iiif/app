# Canopy IIIF

[![Deploy to GitHub Pages](https://github.com/canopy-iiif/app/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/canopy-iiif/app/actions/workflows/deploy-pages.yml)

Static site generator powered by MDX and IIIF. Use `@canopy-iiif/lib` to build content from `content/` and generate HTML in `site/`.

## Quick Start

- Install: `npm install`
- Develop: `npm run dev` (serves `http://localhost:3000`)
- Build: `npm run build`

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

## Search Page (MDX Composition)

Compose the search UI with MDX at `content/search/_layout.mdx`. The builder injects a `search` prop so you can place the primitives anywhere:

- `props.search.form`: search input (`<input id="search-input" />`).
- `props.search.results`: results container (`<ul id="search-results"></ul>`).
- `props.search.count`: live count of shown results (`<span id="search-count"></span>`).
- `props.search.summary`: live summary text (`<div id="search-summary"></div>`), e.g., “Found X of N for “query””.

Example:

```
# Search

<div className="search-grid">
  <aside>
    <strong>Results:</strong> {props.search.count}
    <div>{props.search.summary}</div>
  </aside>
  <section>
    {props.search.form}
    {props.search.results}
  </section>
</div>
```

Notes:

- If `content/search/_layout.mdx` is absent, a minimal fallback page is generated.
- Client behavior is provided by `site/search.js`, which wires the input and updates count/summary.
- Type filters and grouping:
  - The search runtime auto-discovers record types in `search-index.json` (e.g., `page`, `work`, `docs`) and renders type checkboxes into `#search-filters`.
  - Results are grouped by type inside `#search-results`. To control placement, add per-type lists with IDs `search-results-<type>` (e.g., `search-results-docs`), otherwise grouped sections are generated automatically.

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
- On push to `main`, `.github/workflows/template.yml` builds a clean template and force‑pushes it to `canopy-iiif/template` (branch `main`).
- The workflow:
  - Excludes dev‑only paths (`.git`, `node_modules`, `packages`, `.cache`, `.changeset`, internal workflows/docs).
  - Rewrites `package.json` to remove workspaces and depend on published `@canopy-iiif/lib`/`@canopy-iiif/ui` versions; sets `build`/`dev` scripts to call the lib directly.
  - Patches the template’s deploy workflow to include an inline “verify HTML generated” step.
- Setup:
  - Create the `template` repo under the `canopy-iiif` org (or your chosen owner) and add a `TEMPLATE_PUSH_TOKEN` secret (PAT with repo write access) to this repo’s secrets.
  - Optionally mark `template` as a Template repository so users can click “Use this template”.

## Contributing

See `CONTRIBUTING.md` for repository structure, versioning with Changesets, release flow, and the template-branch workflow.
