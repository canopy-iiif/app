Lib Agent Notes
===============

Mission
-------
- Provides the Node-side builder, SSR utilities, and client runtime bundles consumed by the static site.
- Owns IIIF ingestion, MDX compilation, site generation, and search indexing.

Core Areas
----------
- `build/`: Orchestrates the site build pipeline (MDX, assets, search, IIIF).
- `components/`: Shared SSR-ready React components (MDX placeholders, layout helpers).
- `iiif/`: Fetching, caching, and normalizing Presentation 3 manifests.
- `search/`: Search runtime bundler + index writer.
- `common.js` / `index.js`: Entry points that wire CLI commands `build()` and `dev()`.

Invariants
----------
- Server code must import UI through `@canopy-iiif/app/ui/server`; never pull browser-only modules into SSR paths.
- Bundled runtimes rely on browser React globals from `site/scripts/react-globals.js`; maintain esbuild shims for `react`, `react-dom`, `react-dom/client`, `flexsearch`, and any new browser deps the UI marks external.
- Keep IIIF cache writes confined to `.cache/iiif/`; document any format changes here before implementation.

Active Cleanup Goals
--------------------
1. Document and untangle build orchestration in `build/` (identify stages, shared utilities, and intended extension points).
2. Expand search indexing to include MDX page records per repository guidelines; ensure `writeSearchIndex` receives unified records.
3. Audit IIIF pipeline error handling and retry logic; capture gaps or performance tweaks in this log.
4. Establish targeted unit/integration tests around MDX rendering and search runtime bundling once baseline docs exist.

Current Focus
-------------
- Build pipeline map: diagram the flow from `build/index.js` through MDX compilation, asset sync, IIIF generation, and search index writes; note which steps run during `dev` versus `build`.
- Search index expansion: confirm where MDX pages are collected, identify reserved filenames to exclude, and outline the data contract passed to `writeSearchIndex`.
- Runtime bundling: review `search/search.js` for esbuild config drift (externals, shims); list required adjustments if UI adds new hydrated components.
- Cache hygiene: document when `.cache/mdx` vs `.cache/iiif` are pruned and add TODOs if cleanup relies on manual intervention.

Risks & Watchpoints
-------------------
- Long reruns: if `dev` mode clears `.cache/iiif` too aggressively it slows iteration; capture triggers before modifying cleanup behavior.
- SSR safety: any import path change that reaches into `ui/src` instead of `ui/server` will break builds on platforms without DOM. Flag code locations handling UI imports.
- Partial failures: build stages lack retry/backoff; note hotspots (network IIIF fetches, MDX parsing) so we can stage resilience work.

Session Ritual
--------------
- Start by checking `build/index.js` for any ad-hoc logic that should be modularised.
- When touching bundler configs, record the rationale plus command to verify (e.g., `npm run build`, targeted script).
- Log open TODOs with references back to this document (`// TODO: see packages/app/lib/AGENTS.md#...`).

Logbook Template
----------------
- Date / engineer
- Stage(s) touched (build, mdx, iiif, search, runtime)
- Changes made / findings (link to sections above)
- Follow-ups created (reference numbered goals)

Logbook
-------
- 2025-09-26 / chatgpt: Hardened runtime bundlers to throw when esbuild or source compilation fails and required `content/works/_layout.mdx`; build now aborts instead of silently writing placeholder assets.
- 2025-09-26 / chatgpt: Replaced the legacy command runtime stub with an esbuild-bundled runtime (`search/command-runtime.js`); `prepareCommandRuntime()` now builds `site/scripts/canopy-command.js` and fails if esbuild is missing.

Verification Commands
---------------------
- Full pipeline: `npm run build`
- Dev/watch validation: `npm run dev`
