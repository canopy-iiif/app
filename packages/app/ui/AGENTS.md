UI Agent Notes
==============

Mission
-------
- Ships browser-facing assets that hydrate MDX placeholders and expose public UI primitives.
- Maintains SSR-safe exports so the build system can render without pulling browser-only code.

Build Outputs
-------------
- `dist/index.mjs`: browser ESM (`platform: neutral`); externals must include `react`, `react-dom`, `react-dom/client`, `react-masonry-css`, `flexsearch`, and `@samvera/clover-iiif/*`.
- `dist/server.mjs`: SSR-safe entry consumed via `@canopy-iiif/app/ui/server`; limit imports to React placeholders and shared utilities.
- `index.js` / `server.js`: Re-export compiled bundles for consumers.

Hydration Patterns
------------------
- MDX renders placeholders (e.g., `<Viewer />`, search primitives) on the server; browser runtimes locate `[data-canopy-*]` markers and mount React using globals from `site/scripts/react-globals.js`.
- Each hydrated component must remain optional during SSR import to avoid `window` access or side effects.

Active Cleanup Goals
--------------------
1. Catalogue existing components in `src/` (Viewer, Search, RelatedItems, Grid) and confirm ownership + dependencies.
2. Audit Tailwind plugin/preset usage; document required classes and ensure generated CSS is scoped.
3. Establish guidelines for adding new hydrated components (naming, placeholder data attributes, external dependencies).
4. Confirm build scripts in `scripts/` capture all externals/shims and note verification steps below.

Current Focus
-------------
- Component inventory: map every export in `src/` to its hydration runtime and SSR counterpart; identify unused or legacy modules.
- Styling strategy: decide which styles belong in `styles/index.css` versus Tailwind preset utilities; document any global CSS risks.
- Build tooling: review `ui/scripts/build-ui.mjs` for esbuild config drift (externals, target, watch mode ergonomics) and note desired improvements.
- Accessibility + performance: capture any known UI gaps (focus management, bundle size) and link to issues once triaged.

Risks & Watchpoints
-------------------
- Externals mismatch: adding a dependency without updating esbuild externals or lib shims causes runtime bundle failures.
- SSR leakage: components should guard against `window`/`document` usage during module evaluation; flag offenders for refactor.
- CSS collisions: Tailwind preset changes can break downstream consumers; document breaking changes and coordinate releases.

Verification Commands
---------------------
- UI bundle only: `npm -w @canopy-iiif/app run ui:build`
- Watch mode while iterating: `npm -w @canopy-iiif/app run ui:watch`
- End-to-end validation: `npm run build` (runs the shared builder and exercises UI outputs).

Session Ritual
--------------
- Before modifying bundles, re-read externals list and update this file if new deps appear.
- When adding CSS, annotate whether it belongs in Tailwind preset or scoped stylesheet.
- Record open questions for the builder team in `packages/app/AGENTS.md` to keep coordination tight.

Logbook Template
----------------
- Date / engineer
- Components or build scripts touched
- Decisions (hydration pattern, styling, dependency changes)
- Follow-up tasks (link to numbered goals or cross-workspace notes)

Logbook
-------
- 2025-09-26 / chatgpt: Removed the legacy `Fallback` component, added a dedicated `FeaturedHero` wrapper, and restored an accessible `data-canopy-command-trigger` button inside `SearchPanel` to keep homepage verification passing.
- 2025-09-26 / chatgpt: Upgraded Tailwind to v4, mapped the command trigger button to `bg-brand`, and ensured template output pins the same dependency.
- 2025-09-27 / chatgpt: Restyled the Search command form with scoped `.canopy-cmdk-*` classes, added base-path aware form resolution, and defaulted SearchPanel grouping to `['work','docs','page']` so new MDX record types appear in the teaser tabs.
