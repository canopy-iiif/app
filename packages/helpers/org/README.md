# Canopy Org Site Helper

Automation glue for updating https://github.com/canopy-iiif/canopy-iiif.github.io from the main Canopy repo.

## Scripts

- `prepare-org-site.js`: stages the built `site/` output into `.org-build/app/`, copies the files in `packages/helpers/org/root/` into the staging area, and drops a `.nojekyll` marker so GitHub Pages serves prebuilt assets without processing.
- `push-org-site.js`: initializes a Git repository inside `.org-build/` and force-pushes it to the configured remote (`ORG_SITE_TARGET_REPO`).
- `render-index.js`: internal helper that turns `root/index.mdx` into `index.html` with server-side rendered MDX + inline CSS.

## Environment variables

| Name | Purpose |
| ---- | ------- |
| `ORG_SITE_OUT_DIR` | Optional path for the staging directory (defaults to `.org-build/`). |
| `ORG_SITE_PUSH_TOKEN` | Required `repo`-scoped token used for pushing to `canopy-iiif.github.io`. |
| `ORG_SITE_TARGET_REPO` | `owner/repo` slug (defaults to `canopy-iiif/canopy-iiif.github.io` in CI). |
| `ORG_SITE_TARGET_BRANCH` | Branch to push (defaults to `main`). |
| `ORG_SITE_COMMIT_MESSAGE` | Commit message used by `push-org-site.js`. |
| `ORG_SITE_GIT_AUTHOR_NAME` / `ORG_SITE_GIT_AUTHOR_EMAIL` | Optional overrides for the Git author; fall back to Mat Jordan + NU email. |

`prepare-org-site.js` expects `site/` to exist. Run `npm run build` with `CANOPY_BASE_PATH=/app` and `CANOPY_BASE_URL=https://canopy-iiif.github.io/app` before invoking the helper so internal links resolve to the org Pages path.

### Root overrides

- Any files placed under `packages/helpers/org/root/` are copied into the staging directory root (next to the `/app` folder). Use this to expose org-level assets such as `robots.txt`, `README.md`, hero imagery, or supplemental CSS.

- `index.mdx`: customize the org landing page with Markdown + JSX. Frontmatter fields support `title`, `description`, `lang`, `bodyClass`, `styles` (inline CSS), `stylesheets` (string or array of hrefs copied as `<link rel="stylesheet" ...>`), and `head` (raw HTML injected into `<head>`). The helper preloads the Inter font and ships a dark gradient baseline; append your own CSS through the `styles` block or by dropping additional assets beside the MDX file.
- `_app.mdx`: optional layout wrapper. Export a component that receives `{children, page}` and render shared chrome (headers, footers, analytics tags, etc.). When present it wraps the rendered `index.mdx` output before serialization.
- `robots.txt`: default crawler rules plus sitemap pointers for both `/` and `/app`. Edit as needed and rerun the workflow; no additional build steps are required.
