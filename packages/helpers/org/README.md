# Canopy Org Site Helper

Automation glue for updating https://github.com/canopy-iiif/canopy-iiif.github.io from the main Canopy repo.

## Scripts

- `prepare-org-site.js`: reads the built `site/` output for sitemap data, copies the `packages/helpers/org/root/` assets into `.org-build/`, renders `index.mdx` (and optional `_app.mdx`) to `index.html`, and drops a `.nojekyll` marker so GitHub Pages serves prebuilt assets without processing. Only `index.html`, `robots.txt`, `README*`, `*.css`, and rewritten `sitemap*.xml(.gz)` files are published.
- `push-org-site.js`: initializes a Git repository inside `.org-build/` and force-pushes it to the configured remote (`ORG_SITE_TARGET_REPO`).
- `render-index.js`: internal helper that turns `root/index.mdx` + `_app.mdx` into `index.html`, injecting canonical metadata, schema.org JSON-LD, and stylesheet links.

## Environment variables

| Name | Purpose |
| ---- | ------- |
| `ORG_SITE_OUT_DIR` | Optional path for the staging directory (defaults to `.org-build/`). |
| `ORG_SITE_PUSH_TOKEN` | Required `repo`-scoped token used for pushing to `canopy-iiif.github.io`. |
| `ORG_SITE_TARGET_REPO` | `owner/repo` slug (defaults to `canopy-iiif/canopy-iiif.github.io` in CI). |
| `ORG_SITE_TARGET_BRANCH` | Branch to push (defaults to `main`). |
| `ORG_SITE_COMMIT_MESSAGE` | Commit message used by `push-org-site.js`. |
| `ORG_SITE_GIT_AUTHOR_NAME` / `ORG_SITE_GIT_AUTHOR_EMAIL` | Optional overrides for the Git author; fall back to Mat Jordan + NU email. |
| `ORG_SITE_BASE_URL` | Canonical URL for the landing page (defaults to `https://canopy-iiif.github.io`). |

`prepare-org-site.js` expects `site/` to exist (for sitemap generation only). Run `npm run build` with `CANOPY_BASE_PATH=/app` and `CANOPY_BASE_URL=https://canopy-iiif.github.io/app` before invoking the helper so sitemap links resolve to the docs deployment path. When copying sitemap files into the org root, the helper rewrites every `<loc>` entry (including `.xml.gz`) to use `CANOPY_BASE_URL` (default `https://canopy-iiif.github.io/app`). No other `site/` files are published, and the org canonical defaults to `https://canopy-iiif.github.io` (override via `ORG_SITE_BASE_URL`).

### Root overrides

- Any files placed under `packages/helpers/org/root/` are copied into the staging directory root (no `/app` folder is published). Use this to expose org-level assets such as `robots.txt`, `README.md`, hero imagery, or supplemental CSS.

- `index.mdx`: customize the org landing page with Markdown + JSX. Frontmatter fields support `title`, `description`, `lang`, `bodyClass`, `stylesheets` (string or array of hrefs copied as `<link rel="stylesheet" ...>`), and `head` (raw HTML injected into `<head>`). A canonical link, JSON-LD `WebSite` payload, and docs stylesheet (`${CANOPY_BASE_URL}/styles/styles.css`) are injected automatically; add additional CSS (for example `/org-site.css`) via `stylesheets` and drop those files beside `index.mdx`.
- `_app.mdx`: required layout wrapper. Export `Head` and `App`—`Head` renders any extra tags for `<head>`, and `App` receives `{children, page}` (frontmatter metadata + canonical URLs) so you can inject consistent chrome just like the main app/template `_app.mdx`.
- `robots.txt`: default crawler rules plus sitemap pointers for both `/` and `/app`. Edit as needed and rerun the workflow; no additional build steps are required.
