# Canopy Frontend Aesthetic Cheatsheet

Author tasks for this skill usually fall into one of three buckets: set global theme knobs, add scoped typography/layout polish, or compose page sections with the bundled MDX components. Keep these reminders handy so you don’t have to reload multiple repo docs.

## Theme knobs
- Edit `/Users/mat/Projects/canopy-iiif/app/canopy.yml` → `theme.appearance | accentColor | grayColor` to swap Radix ramps globally before touching CSS.
- Custom CSS overrides live in `/Users/mat/Projects/canopy-iiif/app/app/styles/index.css` (global) and `/Users/mat/Projects/canopy-iiif/app/app/styles/custom.css` (scoped). Import new layers there.
- The Tailwind preset injects CSS variables at build time. Production builds append these variables after your overrides, so add `!important` when forcing bespoke palettes.
- Use semantic utilities such as `bg-brand`, `text-brand`, `border-muted`, `text-subtle`, `bg-panel`, `shadow-panel`, and spacing helpers (`gap-grid`, `py-section`, `px-layout`) that are already mapped to the design tokens. No raw hex unless you are authoring a ramp in `@layer properties`.

## Typography & spacing
- Default serif headings (`h1-h4`, `.canopy-logo`) ship from `/Users/mat/Projects/canopy-iiif/app/app/styles/index.css`. Override via `--font-serif`/`--font-sans`.
- Keep longform prose inside `.max-w-content` or `.max-w-wide` wrappers to match docs. For hero copy, constrain to `max-w-prose` utilities or `md:w-2/3`.
- Global rhythm: `py-16 md:py-24` for full-bleed sections, `gap-6` for cards/sliders, `leading-relaxed` for paragraphs, `tracking-tight` for serif headings.
- When embedding typekit or Google Fonts, add `<link>` blocks inside `/Users/mat/Projects/canopy-iiif/app/content/_app.mdx`’s `Head()` export so dev + build remain in sync.

## Component cues
- **Hero / `<Interstitials.Hero>`** — centerline layout with rotating featured manifests. Provide `headline`, `description`, `links`, `height`, `background`. Use `random={false}` for deterministic page loads. Imagery expects thumbnails from the IIIF cache.
- **Search primitives** — `<SearchForm />`, `<SearchSummary />`, `<SearchResults layout="grid|list" />`, `<SearchTabs />`, `<SearchTotal />`. Wrap them in a `grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-10` layout when composing landing pages.
- **`<RelatedItems>`** — supply `top` and optional `iiifContent`. On work pages, it auto-selects metadata facets present on the manifest. Keep slider blocks in stacked sections using `space-y-12`.
- **Viewer** — `<Viewer iiifContent="…manifest…">` renders SSR-safe markup; hydration happens through `site/canopy-viewer.js`. Always wrap in `.bg-panel shadow-panel rounded-3xl p-4 md:p-6` when floating it among text-heavy sections.
- **MDX callouts** — place bespoke components under `/Users/mat/Projects/canopy-iiif/app/app/components/` and wire them via `app/components/mdx.tsx` to keep aesthetic reuse consistent.

## Workflow reminders
1. Start with `npm run dev` for live reload. Theme tweaks recompile Tailwind, MDX edits hot reload, and `assets/` pushes directly into `site/`.
2. Touch `canopy.yml` for palette/dark mode changes first; only drop to CSS when you need per-page nuance.
3. For global CSS edits, adjust `app/styles/index.css` or `app/styles/custom.css`, then confirm production parity with `npm run build`.
4. Use `_layout.mdx` files per section (`content/docs/_layout.mdx`, etc.) to cascade typography or accent defaults deeper in the tree.
5. Commit to `packages/app/ui/server` exports (Viewer, Interstitials, Search) whenever you need hydrated UI—never import the browser entry directly during SSR.
