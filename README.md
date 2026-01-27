# Canopy IIIF

Create fast, light digital projects from IIIF collections. Canopy IIIF helps libraries, archives, museums, and researchers add narrative context to IIIF material without worrying about derivatives or storage. Author in Markdown, publish static sites, and keep maintenance low while showcasing interoperable collections.

[![Deploy to GitHub Pages](https://github.com/canopy-iiif/app/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/canopy-iiif/app/actions/workflows/deploy-pages.yml) [![Release and Template](https://github.com/canopy-iiif/app/actions/workflows/release-and-template.yml/badge.svg)](https://github.com/canopy-iiif/app/actions/workflows/release-and-template.yml)

**Starting fresh?** Follow the Get Started guide and build from https://github.com/canopy-iiif/template. This `app` repo is reserved for core Canopy development and documentation and should not be cloned for digital projects.

- **[Documentation](https://canopy-iiif.github.io/app/)**
- **[Get Started](https://canopy-iiif.github.io/app/about/get-started)**
- **[Template](https://github.com/canopy-iiif/template)**

## Quick Start

- `npm install`
- `npm run dev` (serves http://localhost:5001 via `app/scripts/canopy-build.mts`)
- `npm run build` (renders UI assets + site)

Refer to https://canopy-iiif.github.io/app/docs/developers for full environment, caching, and repo structure notes.

## Documentation Map

- Getting started basics: https://canopy-iiif.github.io/app/docs/
- Content authoring, routes, and MDX layouts: https://canopy-iiif.github.io/app/docs/content/
- Components, hydration, and interactive search: https://canopy-iiif.github.io/app/docs/components/
- Theme controls, Tailwind presets, and CSS tokens: https://canopy-iiif.github.io/app/docs/theme/
- IIIF ingestion, search indexing, and data flows: https://canopy-iiif.github.io/app/docs/canopy/
- Developer workflow, publishing, and troubleshooting: https://canopy-iiif.github.io/app/docs/developers/

Each page links to deeper guides (assets, works layouts, Search composition, etc.), so the README stays light.

## Template Workflow

- `.github/workflows/release-and-template.yml` publishes packages and, on release, stages a clean build into `.template-build/` before force-pushing to `canopy-iiif/template`.
- The staging step strips dev-only paths, rewrites `package.json` to consume published `@canopy-iiif/app` bundles, and keeps the template’s workflow lean.
- Provide a personal access token as the `TEMPLATE_PUSH_TOKEN` secret and mark `canopy-iiif/template` as a template repo if you want the GitHub “Use this template” button.
- Details live at https://canopy-iiif.github.io/app/docs/developers/#template-workflow.

## Publishing `@canopy-iiif/app`

- The distributable package lives in `packages/app` and exports the builder plus UI assets.
- Use Changesets (`npm run changeset`) to record versions, run `npm run release`, and let the release workflow publish to npm before the template sync runs.
- Keep `repository`, `files`, and `publishConfig.access: public` in `packages/app/package.json` so npm users and GitHub Insights can trace dependents.
- Publishing guidance, update workflows, and automation hooks are documented at https://canopy-iiif.github.io/app/docs/releases/.

## License

Canopy IIIF (Canopy) is an open-source project by Mat Jordan, released under the MIT License. Anyone may adapt its features and deploy digital projects without restriction. Canopy follows the principles of the open web: its source code is transparent, and its implementations are static and portable. It runs on any server or service that delivers simple files read directly by web browsers. By working directly with IIIF resources, Canopy keeps materials with the libraries, museums, and archives that serve them, along with their metadata, rights statements, and terms of use. Implementers should be aware of the rights and terms governing the materials they reference, publish, and deploy to the web using Canopy.
