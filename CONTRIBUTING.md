# Contributing Guide

Thank you for contributing to Canopy. This repository is a monorepo with a private app and a publishable library package.

## Repository Layout
- `@canopy-iiif/app` (root): private app, workspace orchestrator, dev entry (`npm run dev`).
- `packages/lib` → `@canopy-iiif/lib`: publishable library exposing `build()` and `dev()`.
- `content/`: MDX pages and per-folder layouts (e.g., `content/_layout.mdx`, `content/works/_layout.mdx`).
- `.cache/iiif/`: cached IIIF collection and manifests.

## Local Development
- Install: `npm install`
- Build once: `npm run build`
- Dev server (watch + live reload): `npm run dev` (serves `site/` at `http://localhost:3000`)

Entrypoint
- Both commands call `node app/scripts/canopy-build.mjs`.
- In dev, it starts the UI watcher (`@canopy-iiif/ui`) and the library dev server.
- In build, it builds UI assets once and then builds the site with the library.

## Versioning

- Semver: patch = fixes/internal, minor = features, major = breaking.
- Command: `npm run version:packages` with a bump flag:
  - Minor: `npm run version:packages -- --minor`
  - Patch: `npm run version:packages`
  - Major: `npm run version:packages -- --major`
- Scope: `@canopy-iiif/lib` and `@canopy-iiif/ui` version together; the root app stays private and auto‑syncs its version.
- Don’t hand‑edit versions or changelogs; the script and Changesets handle it.

## Release Flow

- Open a PR with changes and get approval.
- Run the version bump command and commit:
  - Commit updated `package.json` and `CHANGELOG.md` files.
- Merge to `main`. The Release workflow:
  - Publishes `@canopy-iiif/lib` and `@canopy-iiif/ui` to npm.
  - Keeps the root app private (guarded by a pre‑publish check).
  - If a publish happened, prepares and pushes a cleaned template repository.

## Template Workflow
This repo is the source for a separate template repository:
- Pushing to `main` triggers `.github/workflows/release-and-template.yml`.
- After a successful publish, the workflow prepares a clean template (excludes dev‑only paths) and force‑pushes it to `canopy-iiif/template`.
- In the template, dependencies on `@canopy-iiif/*` are set to the latest published versions and `build`/`dev` run `node app/scripts/canopy-build.mjs`.

## Pull Requests
- Keep PRs focused and small. Include rationale and test plan.
- Ensure `npm run build` passes locally.
- If changing the library API or behavior, include a changeset (`npm run changeset`).

Thanks for helping improve Canopy!
