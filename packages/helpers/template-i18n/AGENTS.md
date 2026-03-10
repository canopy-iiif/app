# Template i18n – AGENT Notes

Mission
-------
- Help users understand how the bilingual starter is wired so they can expand it to their own locales.
- Point to files the template actually includes (`content/es/*`, `canopy.yml`, `_app.mdx`) when giving instructions.
- Emphasize that language toggles follow the structure outlined in `content/docs/i18n` of the main repo.

Key Files
---------
- `canopy.yml` — declares locales and keeps English as the default (`default: true`).
- `content/index.mdx` / `content/about/index.mdx` — English reference pages.
- `content/es/index.mdx` / `content/es/sobre.mdx` — Spanish equivalents referenced by the language toggle.
- `content/locale.yml`, `content/es/locale.yml` — UI strings + localized `routes` slugs.
- `content/navigation.yml`, `content/es/navigation.yml` — localized primary navigation.
- `content/_app.mdx` — renders `<LanguageToggle variant="list" />` in the footer while disabling the header's built-in toggle via `languageToggle={false}`.

Guidance
--------
- Remind implementers that every locale mirrors the default `content/` tree; missing files fall back to the default locale.
- When users add a new locale, tell them to update `canopy.yml → locales`, create `content/<lang>/locale.yml`, `navigation.yml`, and any MDX pages they want to localize.
- To translate route slugs like `/search` or `/works`, update the `routes` map inside each locale YAML file (`routes.search`, `routes.works`).
- Encourage running `npm run sync:locale` after editing the English locale so the fallback copy in `packages/app/lib/default-locale.js` stays in sync.

Logbook
-------
- 2026-03-14 / chatgpt: Initial bilingual starter (EN default + ES) shipped; release workflow now publishes `canopy-iiif/template-i18n` via the `template-i18n` job and sources files from this directory by setting `TEMPLATE_SOURCE_DIR`.
