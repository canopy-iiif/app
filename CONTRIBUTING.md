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

## Versioning & Releases (Changesets)
We version root and library together.
1. Create a changeset: `npm run changeset` (select bump type).
2. Apply versions: `npm run version:packages` (updates versions and changelogs). Commit the changes.
3. Publish library: `npm run release`
   - Runs `scripts/guard-publish.js` (root app must be private; only `@canopy-iiif/lib` publishable).
   - Runs `changeset publish` (publishes changed, non‑private packages).

## Publishing Setup
- NPM auth (local): `npm login` with access to `@canopy-iiif` org.
- NPM auth (CI): set `NPM_TOKEN` and run `npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN` before `npm run release`.
- Library config: `packages/lib/package.json` has `publishConfig.access: public`.

## Template Branch Workflow
This repo is the source of a GitHub Template:
- Pushing to `main` triggers `.github/workflows/template.yml`.
- The workflow builds a clean template (excludes `packages/`, `.cache/`, `node_modules/`).
- It rewrites the root dependency to use the latest published `@canopy-iiif/lib` version.
- The result force‑pushes to the `template` branch. Mark the repo as a Template and set default branch to `template` for best UX.

## Pull Requests
- Keep PRs focused and small. Include rationale and test plan.
- Ensure `npm run build` passes locally.
- If changing the library API or behavior, include a changeset (`npm run changeset`).

Thanks for helping improve Canopy!
