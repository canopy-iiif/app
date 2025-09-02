# Repository Guidelines

This repository is a minimal Node.js project. Use this guide to add code and grow the project consistently and safely.

## Project Structure & Module Organization
- `app/`: app entry and styles
  - `app/scripts/canopy-build.mjs`: single stable entry for dev/build (orchestrates UI + lib)
  - `app/styles/`: optional app CSS
- `content/`: MDX pages and section layouts
- `assets/`: static files copied into `site/`
- `packages/`: workspaces
  - `packages/lib` (`@canopy-iiif/lib`): builder (CommonJS) exposing `build()` and `dev()`
  - `packages/ui` (`@canopy-iiif/ui`): UI runtime assets (bundled by esbuild)
  - `packages/helpers`: maintenance scripts
- Root: `package.json`, `.gitignore`, `.github/workflows/*`, docs

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: starts UI watcher and dev server (port 3000).
- `npm run build`: builds UI assets, then the static site to `site/`.
- `npm test`: placeholder; configure a real test runner before use.

Recommended scripts in `package.json`:
```json
{
  "scripts": {
    "dev": "node app/scripts/canopy-build.mjs",
    "build": "node app/scripts/canopy-build.mjs",
    "test": "echo \"No tests yet\" && exit 0",
    "lint": "eslint .",
    "format": "prettier -w ."
  }
}
```

## Coding Style & Naming Conventions
- Indentation: 2 spaces; use semicolons; single quotes for strings.
- Naming: camelCase for variables/functions, PascalCase for classes, kebab-case file names.
- Modules: prefer small, pure functions; keep files under ~200 lines when practical.
- Tooling: ESLint + Prettier (recommended). If configured, run `npm run lint` and `npm run format` before pushing.

## Testing Guidelines
- Framework: Jest (recommended).
- Test names: mirror source path; use `*.test.js` (e.g., `src/utils/math.test.js`).
- Coverage: target ≥80% lines/branches for new or changed code.
- Run tests: `npm test` once Jest is configured.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat: add parser`, `fix: handle null id`).
- Scope: small, focused commits; present tense, imperative mood.
- PRs: include a clear description, linked issues, test plan/commands, and screenshots for UI changes.
- Checks: ensure local tests/lint pass; request review when green.

## Security & Configuration Tips
- Secrets: never commit credentials; use `.env` and document required variables.
- Node version: pin with `.nvmrc` (e.g., `18`); run `nvm use`.
- Dependencies: review with `npm audit` and update regularly.

## Search Framework (MDX-driven)

Goal: Allow authors to fully compose the search page via MDX, while the builder wires data and behavior.

- Entry layout: `content/search/_layout.mdx` (optional). If present, the builder renders it and injects a `search` prop with primitives:
  - `props.search.form`: search input element (`<input id="search-input" />`).
  - `props.search.results`: results container (`<ul id="search-results"></ul>`).
  - `props.search.count`: live-updating count of shown results (`<span id="search-count"></span>`).
  - `props.search.summary`: live-updating summary (`<div id="search-summary"></div>`), e.g., “Found X of N for “query””.

- Composition: Authors place these placeholders anywhere in their MDX; the builder does not impose layout. If no layout exists, a minimal fallback page is generated.

- Build steps:
  - `writeSearchIndex(records)`: writes `site/search-index.json`. Currently fed by IIIF build (`packages/lib/iiif.js`) and contains items `{ id, title, href }` for each Manifest page.
  - `ensureSearchRuntime()`: bundles `site/search.js` with FlexSearch; it loads the JSON, indexes titles, and updates the DOM.
  - `buildSearchPage()`: renders `content/search/_layout.mdx` (if present) with the `search` prop and wraps it with the App (`content/_app.mdx`) and MDXProvider.

- Runtime behavior (site/search.js):
  - Loads `./search-index.json` and builds a FlexSearch index (title-only, forward tokenization).
  - Binds to `#search-input` and `#search-results`; updates `#search-count` and `#search-summary` as the query changes.
  - Initializes from `?q=` URL param.
  - Resolves links with base path awareness via `CANOPY_BASE_PATH`.

- Extensibility notes:
  - Additional sources can be added to the index (e.g., MDX pages) by contributing records to `searchRecords` and calling `writeSearchIndex`.
  - If authors need custom result item markup, we can evolve the runtime to support a templating hook or expose a hydrated component, but that is out of scope for the current minimal approach.

## Search Index Extensibility

## Helpers Package and Root Cleanliness

- Keep the repository root clean. Do not add ad-hoc top-level `scripts/`.
- All helper scripts live under `packages/helpers/`.
- Examples:
  - Release guard: `node packages/helpers/guard-publish.js`
  - Build check: `node packages/helpers/verify-build.js`

## Package Management

- Standardize on npm workspaces. Use `npm -w <workspace> run <script>` in root scripts.
- pnpm is not used here; `pnpm-lock.yaml` and `pnpm-workspace.yaml` have been removed and `.pnpm-store/` is ignored.

## Assets and Live Reload

- Static files under `assets/` are copied to the site root (preserving subpaths) during build.
  - Example: `assets/images/example.jpg` → `site/images/example.jpg`.
- During `npm run dev`, changes in `assets/` are watched and synced directly to `site/` without triggering a full rebuild of MDX or IIIF content; the browser live‑reloads automatically.

## IIIF Build

- Enable IIIF work page generation by adding `content/works/_layout.mdx`. The layout receives `props.manifest` (normalized to IIIF Presentation 3 when possible).
- The collection URI is configured via `canopy.yml` (`collection.uri`) or the `CANOPY_COLLECTION_URI` environment variable.
- Output pages are written to `site/works/<slug>.html`.
- Performance tuning: `iiif.chunkSize` and `iiif.concurrency` in `canopy.yml`, or env vars `CANOPY_CHUNK_SIZE` and `CANOPY_FETCH_CONCURRENCY`.

## IIIF Cache

- Location: `.cache/iiif/`
  - `index.json`: primary index with `byId` (Collection/Manifest ids → slugs/parents) and `collection` metadata (uri, hash, updatedAt).
  - `manifests/{slug}.json`: cached normalized Manifest JSON per work.
- Changing the configured collection URI resets the manifest cache. To force a clean fetch, delete `.cache/iiif/`.

## Development Notes

- `npm run dev` starts a local server with live reload.
- MDX changes under `content/` trigger a full site rebuild + reload.
- Asset changes under `assets/` sync only the changed files to `site/` and reload without a full rebuild.

## Quick Commands

- Release guard: `node packages/helpers/guard-publish.js`
- Build verification: `node packages/helpers/verify-build.js`

--## Release and Template Workflow

- Strategy: releases are published via Changesets; only after a successful publish does the workflow prepare and force‑push a clean template to `canopy-iiif/template`.
- Trigger: `.github/workflows/release-and-template.yml` runs on `push` to `main` (and can be dispatched manually). It uses `changesets/action` to publish and exposes whether a release occurred; the template push runs only when a publish happened.
-- What it does:
  - Copies the repo into `dist-template/`, excluding dev‑only paths (e.g., `.git`, `node_modules`, `packages`, `.cache`, `.changeset`, template workflows, agent docs).
  - Rewrites `dist-template/package.json` to remove workspaces, swap `workspace:*` deps for published versions of `@canopy-iiif/lib` and `@canopy-iiif/ui`, and set `build`/`dev` scripts to run `node app/scripts/canopy-build.mjs`.
  - Patches the Pages deploy workflow in the template to inline the build verify step (no helpers package there).
  - Force‑pushes the result to `main` of `${OWNER}/template` (org: `canopy-iiif`).
- Setup required:
  - Create the `template` repository under the `canopy-iiif` org.
  - Add a secret in this repo named `TEMPLATE_PUSH_TOKEN` (PAT with `repo` write access to `canopy-iiif/template`).
  - Optional: mark `template` as a Template repository in GitHub settings.

We index two sources: IIIF Manifests ("works") and static MDX pages ("pages"). Keep this simple and predictable.

- Record shape: `{ id?, title, href, type }`
  - `type`: `'work'` for IIIF manifest pages under `site/works/*.html`, `'page'` for MDX pages.
  - Optional future fields: `tags` (string array), custom fields for richer rendering.

- Current sources:
  - IIIF: already pushes `{ id, title, href, type: 'work' }` via `packages/lib/iiif.js` into `searchRecords`.
  - MDX: extend the build to add `{ title, href, type: 'page' }` for each non-reserved MDX file.

- Exclusions:
  - Reserved files starting with `_` (e.g., `_app.mdx`, `_layout.mdx`).
  - The search page itself (anything under `content/search/`).
  - Optionally, other utility pages such as `sitemap.mdx` can be excluded if desired.

- Where to hook:
  - In `packages/lib/build.js`, we already collect `pages` for the sitemap. Reuse that pass to create search records for MDX:
    - For each collected page, push `{ title, href, type: 'page' }` into the `searchRecords` array returned from the IIIF build, then call `writeSearchIndex` once with the combined list.

- Frontmatter (implemented):
  - Add optional YAML frontmatter at the top of MDX files:
    ```
    ---
    type: page   # or other string; when omitted (and frontmatter is present) page is excluded
    search: true # set to false to exclude
    ---
    ```
  - Policy:
    - If a frontmatter block exists and `search: false`, exclude.
    - If a frontmatter block exists and no `type` is provided, exclude.
    - If no frontmatter block exists, default to `type: 'page'` and include.
  - Frontmatter is stripped from MDX before compilation (no plugins needed).

- Directory layouts (`_layout.mdx`):
  - You can set a default type for all pages under a directory by adding frontmatter to the directory’s `_layout.mdx` (e.g., `content/docs/_layout.mdx` → `type: docs`).
  - Resolution order for a page’s type: page frontmatter `type` → nearest directory `_layout.mdx` frontmatter `type` → default `'page'` if the page has no frontmatter block.
  - If a page has a frontmatter block but omits `type`, it is excluded (does not inherit from layout in that case).

- Treating types separately (runtime):
  - Keep FlexSearch in simple mode indexing only `title` for now; store `type` in each record.
  - After search returns id hits, filter/group results in JS by `type` for toggles (e.g., show/hide "pages" vs "works").
  - Later, add a small hydrated UI component to render result items differently per type (textual for `'page'`, visual card/figure for `'work'`).

- Step-by-step rollout plan:
  1) Add MDX page records (`type: 'page'`), exclude `content/search/**`.
  2) Add `type` to all records and keep the runtime unchanged (count/summary include all).
  3) Add optional type toggle UI (no indexing changes needed) and client-side filtering.
  4) Introduce frontmatter parsing to set `type` and `search: false` (backward compatible; default `'page'` when absent; skip when neither `type` nor explicit opt-in is provided, per policy).
  5) Add per-type result renderers in `@canopy-iiif/ui` with sensible fallbacks.
