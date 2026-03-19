---
name: canopy-frontend-aesthetic
description: Maintain the Canopy IIIF frontend look-and-feel when editing `canopy.yml`, `app/styles/**/*`, or MDX/React components. Use for theming, typography, layout, and component work so UI stays on-brand with Radix-driven tokens and hydrated Canopy sections.
---

# Canopy Frontend Aesthetic

## Overview

Use this skill whenever you design, refactor, or review UI inside `/Users/mat/Projects/canopy-iiif/app`. It keeps colors, typography, spacing, and hydrated MDX components consistent with the Canopy IIIF preset so marketing pages, docs, and work views all feel unified.

Load the quick cheatsheet in `references/aesthetic-cheatsheet.md` when you need a condensed reminder of tokens, components, or spacing scales.

## Quick workflow

1. **Clarify the surface.** Identify whether you are touching global theme knobs (`canopy.yml`, `app/styles/index.css`), scoped section styles (`content/**/_layout.mdx`), or bespoke components (`app/components/**/*`).
2. **Pick the palette path.** Update `canopy.yml → theme` when an entire site needs a new accent/gray ramp; only fall back to CSS overrides for local experiments.
3. **Compose within Canopy primitives.** Build sections with the shipped MDX components (Hero, Viewer, RelatedItems, Search primitives) plus Tailwind utilities such as `bg-brand`, `text-muted`, `max-w-content`.
4. **Hydrate responsibly.** SSR-safe components live in `@canopy-iiif/app/ui/server`; interactive variants hydrate via scripts under `site/`. Never import the browser bundle when rendering MDX.
5. **Check dev vs. build.** Run `npm run dev` while iterating and `npm run build` before handing off to ensure CSS layering and hydration behave the same in production.

## Theme + color guardrails

- Configure the primary palette in `/Users/mat/Projects/canopy-iiif/app/canopy.yml`:
  - `appearance`: `light` or `dark`, flipping the neutral ramp.
  - `accentColor`: Radix accent shorthand (e.g., `bronze`, `indigo`) powering `bg-brand`, button fills, and links.
  - `grayColor`: base neutral ramp for typography, cards, borders.
- The Tailwind preset (`packages/app/ui/tailwind-canopy-iiif-preset.js`) injects CSS variables from Sass during every build. Utilities such as `bg-brand`, `text-subtle`, `border-panel`, and `shadow-panel` resolve to those variables—prefer them over hard-coded hex.
- For institutional palettes, override variables inside `app/styles/index.css` or `app/styles/custom.css` using `@layer properties`. Production builds append generated theme CSS after your files, so add `!important` when you must win the cascade.
- Component-scoped shims (Clover viewer, sliders) require targeting their root classes (`.clover-viewer`, `.canopy-slider`) outside `@layer properties` because they define their own CSS variables.

## Typography, spacing, and layouts

- Defaults live in `app/styles/index.css`: serif headings, 110% base font size, serif logo lockup. Update `--font-sans`, `--font-serif`, and `--default-font-family` when swapping type systems, then load fonts inside `content/_app.mdx`.
- Keep body text inside `max-w-content` or `max-w-wide` wrappers; pair with `prose` utilities for docs. Heroes and lead-ins should cap at `md:w-2/3` with `leading-relaxed` copy to mirror canonical pages.
- Section rhythm: `py-16 md:py-24` vertically, `px-6 md:px-10` horizontally, `gap-6` between cards/sliders, and `space-y-12` for stacked sections.
- When embedding media next to copy, use responsive grids such as `grid grid-cols-1 lg:grid-cols-2 gap-10` and wrap components like `<Viewer />` with `.bg-panel shadow-panel rounded-3xl p-4 md:p-6`.

## Composing MDX + React sections

- Reference the shipped components:
  - `<Interstitials.Hero>` rotates featured manifests configured in `canopy.yml → featured`. Supply `headline`, `description`, `links`, and `background="theme|transparent"`.
  - `<Viewer iiifContent="…">` SSR renders a placeholder that hydrates via `site/canopy-viewer.js`. Keep markup lightweight and let hydrating scripts mount the Clover viewer.
  - `<RelatedItems top={3} iiifContent?="…">` stitches sliders based on indexed facets. Leave `iiifContent` undefined on landing pages to pull top values per facet.
  - Search primitives `<SearchForm />`, `<SearchResults layout="grid|list" />`, `<SearchTabs />`, `<SearchSummary />`, `<SearchTotal />` hydrate through `site/search.js`. Arrange them in grid-based layouts for clarity.
- Custom callouts should live under `app/components/`. Register SSR-safe components via `components` exports and browser-only widgets via `clientComponents` in `app/components/mdx.tsx`. Follow the hydration rules: no direct `window` access in `.tsx` unless you wrap it with a `.client.tsx` variant.
- Use `_layout.mdx` files in directories such as `content/docs/` to set default props, wrappers, or typography for entire sections instead of repeating wrappers per page.

## Build + validation reminders

- Start `npm run dev` whenever touching MDX, styles, or assets—the watcher rebuilds content and syncs `assets/` into `site/`.
- Run `npm run build` to confirm CSS ordering (`@layer properties`) and hydration before shipping or capturing screenshots.
- When IIIF thumbnails look outdated, delete `.cache/iiif/` and rerun the build with network access to refresh manifest metadata.
- Keep React/FlexSearch externals out of UI bundles: browser builds rely on shims via `site/scripts/react-globals.js`. If you see “Dynamic require of 'react' is not supported,” revisit the externals list in the UI build config.

## References

- `references/aesthetic-cheatsheet.md` — condensed reminders for theme knobs, typography spacing, and component cues. Load it whenever you need a quick prompt mid-task.
