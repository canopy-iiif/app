App Package Agent Notes
=======================

Mission
-------
- Represents the published workspace `@canopy-iiif/app` that ships both builder logic and UI assets.
- Coordinates the contract between SSR/build-time code in `lib/` and browser code in `ui/`.
- Owns release quality: tests, build scripts, release log data, and workspace metadata live here.

Structure at a Glance
---------------------
- `lib/`: Node-side builder and runtimes (see `packages/app/lib/AGENTS.md`).
- `ui/`: Browser bundle + SSR-safe entry (see `packages/app/ui/AGENTS.md`).
- `package.json`: Publishes `lib/` as CommonJS and exports UI entrypoints; `prepublishOnly` builds UI.
- Release notes: maintained via `content/docs/developers/releases/releases.data.mjs` and surfaced in the docs + workflows.

Active Cleanup Goals
--------------------
1. Clarify the seam between `lib/` and `ui/` so each bundle only owns its layer (reduce cross-import drift).
2. Capture open work for the search experience (index expansion, result rendering) and align with `lib/search` and UI consumers.
3. Establish a baseline test + lint plan per workspace; document expected commands before we add automation.
4. Audit package exports to ensure only documented entry points are surfaced and tree-shaking remains safe.

Current Focus
-------------
- Search roadmap: confirm how MDX page indexing will feed into `lib/build` and ensure UI renders new record types without regressions; coordinate with `packages/app/lib/AGENTS.md#active-cleanup-goals`.
- Build + release confidence: list missing automated checks (lint, type coverage) and decide where to stage them before wiring into CI.
- Packaging hygiene: review `exports` map against actual consumers; flag any deprecated paths for removal and schedule migration notes.
- Documentation debt: capture knowledge about environment variables (e.g., `CANOPY_BASE_PATH`, `CANOPY_COLLECTION_URI`) so downstream workspaces do not duplicate it.

Risks & Watchpoints
-------------------
- UI build drift: if UI bundles change externals without updating `lib` shims, runtime hydration breaks. Mirror changes immediately in the lib agent.
- Release pipeline: `prepublishOnly` must stay fast enough for Changesets publish; track any long-running build steps and consider caching.
- Duplicate state: avoid introducing overlapping configuration between `app/scripts/canopy-build.mjs` and `lib/build`; note any duplication for consolidation.

Session Checklist
-----------------
- Skim `packages/AGENTS.md` for repo-wide themes before diving into subdirectories.
- Update `lib/` and `ui/` agent logs with current findings; record TODOs using `// TODO: see ...` in code when helpful.
- Note verification steps run this session (tests/builds) and any gaps.

Logbook Template
----------------
- Date / Session owner
- Areas touched (lib/ui/helpers) and relevant PR/branch links
- Decisions captured (reference ADR or section)
- Follow-ups assigned (copy into Active Cleanup Goals or per-directory lists)

References
----------
- `packages/app/lib/AGENTS.md`
- `packages/app/ui/AGENTS.md`
- Root packages overview: `packages/AGENTS.md`
