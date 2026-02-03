# canopy-iiif.github.io

This repository hosts the build output for the public Canopy IIIF landing page. The contents are managed automatically by https://github.com/canopy-iiif/app whenever a new commit lands on `main`.

- `/index.html` is rendered from `packages/helpers/org/root/index.mdx` (optionally wrapped by `_app.mdx`).
- `sitemap*.xml` mirror the docs URLs under `/app/` but the compiled `/app` directory itself is **not** published here—refer to https://canopy-iiif.github.io/app for the full documentation.

- Latest docs: https://canopy-iiif.github.io/app/
- Source code: https://github.com/canopy-iiif/app
- Template for new projects: https://github.com/canopy-iiif/template

🛑 Do not edit files in this repository directly. Any manual changes will be overwritten by the release automation.
