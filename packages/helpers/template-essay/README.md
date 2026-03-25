# Canopy Template (Essay)

This starter mirrors the primary Canopy template but swaps the sample content for a long-form, essay-driven homepage. Use it when you want your landing page to read like a publication entry with dense copy, inline IIIF images, and a references section that points back to selected manifests.

## Highlights

- `content/index.mdx` is a complete essay layout with an intro, multiple chapters, inline `<Image />` components, and a `<ReferencedItems />` block wired up through `referencedManifests`.
- `content/navigation.yml` keeps the top-level navigation small: Essay, Works, Search, and Notes.
- `content/notes/index.mdx` shows how to author a lightweight colophon/credits page that links back to manifests and calls out next steps for editors.
- `_app.mdx` swaps the font stack for Newsreader and tweaks main spacing so the entire site reads like a print essay.
- `canopy.yml` reuses the standard fixtures so the hero slider, manifest cache, and RelatedItems components render immediately.

## Getting Started

1. Install dependencies: `npm install`.
2. Run `npm run dev` to start the builder and preview server.
3. Update `canopy.yml` with your IIIF collection or manifest list.
4. Edit `content/index.mdx` to replace the sample essay copy with your own voice—drop additional components anywhere in the markdown body.
5. Adjust `content/notes/index.mdx` or add new directories for supporting pages when you need extended context, bibliographies, or acknowledgements.

## Preview from the monorepo

While developing inside `canopy-iiif/app`, run `npm run preview:template-essay` to stage this template into `.template-essay-preview/`, install its dependencies, and launch `npm run dev`. Stop the script with `Ctrl+C` when you are done previewing.
