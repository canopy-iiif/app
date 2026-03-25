# Template Essay – AGENT Notes

Mission
-------
- Provide an essay-first reference so users can see how to structure a landing page around long-form copy.
- Highlight where manifests are cited (`referencedManifests`) so `<ReferencedItems />` and work backlinks behave out of the box.
- Keep guidance grounded in the files this template actually ships with; point to `content/index.mdx`, `content/notes/index.mdx`, `_app.mdx`, and `canopy.yml` when explaining changes.

Key Files
---------
- `_app.mdx` — swaps the base font for Newsreader and introduces `main[data-template-essay]` spacing so essays feel like a continuous article.
- `content/index.mdx` — long-form homepage with intro, sections, pull quotes, inline `<Image />` usage, and a `<ReferencedItems />` section wired via frontmatter.
- `content/notes/index.mdx` — colophon/credits example; shows how to use markdown lists for production notes and next steps.
- `content/navigation.yml` — trims the nav down to Essay, Works, Search, and Notes so the entry point stays focused.
- `canopy.yml` — points to the standard fixture manifests/collections so screenshots + RelatedItems render immediately.

Guidance
--------
- Encourage authors to start by editing `content/index.mdx` only—keep the layout intact so they retain the heading rhythm, Image component usage, and ReferencedItems grid.
- Remind them to update the `referencedManifests` array whenever they swap in new works so backlinks stay accurate.
- `content/notes/index.mdx` doubles as a checklist. Point implementers there when they ask how to expand with chapters, footnotes, or additional essays.
- `_app.mdx` only tweaks fonts + spacing. Any heavier structural changes should go through their own `_app.mdx` once they clone this template.

Logbook
-------
- 2026-03-30 / chatgpt: Initial essay starter authored; ships with long-form homepage, notes page, Newsreader font stack, and navigation tuned for a single-entry site.
