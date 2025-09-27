// Canopy defaults: design tokens + UI styles.
// This config is the bridge between the UI workspace (packages/app/ui)
// and the site-level Tailwind build:
//  - Resolve the published Canopy Tailwind preset/plugin so utility classes
//    remain in sync with @canopy-iiif/app releases.
//  - Compile the Sass design tokens once and register them on :root before
//    Tailwind runs, ensuring utilities like bg-brand resolve to the same
//    CSS variables used by the UI runtime.
//  - Target authored MDX/HTML along with the shipped UI/IIIF component code
//    so the extractor sees every class we emit server-side.
const path = require("path");
const plugin = require("tailwindcss/plugin");
const sass = require("sass");

const toGlob = (...parts) => path.join(...parts).replace(/\\/g, "/");
const projectRoot = path.join(__dirname, "..", "..");
const canopyUiDist = path.dirname(require.resolve("@canopy-iiif/app/ui"));
const canopyUiRoot = path.dirname(canopyUiDist);
const canopyLibRoot = path.dirname(require.resolve("@canopy-iiif/app"));

function compileCanopyTokens() {
  try {
    const entry = path.join(canopyUiRoot, "styles", "variables.emit.scss");
    const result = sass.compile(entry, { style: "expanded" });
    return result && result.css ? result.css : "";
  } catch (error) {
    return "";
  }
}

const canopyTokensCss = compileCanopyTokens();

function parseTokens(css) {
  if (!css) return {};
  const match = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!match) return {};
  const body = match[1];
  const entries = body
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return null;
      const prop = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).replace(/!important/g, '').trim();
      return [prop, value];
    })
    .filter(Boolean);
  const root = {};
  for (const [prop, value] of entries) {
    root[prop] = value;
  }
  return Object.keys(root).length ? { ':root': root } : {};
}

const canopyTokenBase = parseTokens(canopyTokensCss);

module.exports = {
  presets: [require("@canopy-iiif/app/ui/canopy-iiif-preset")],
  content: [
    toGlob(projectRoot, "content/**/*.{mdx,html}"),
    toGlob(canopyUiDist, "**/*.{js,mjs,jsx,tsx}"),
    toGlob(canopyLibRoot, "iiif/components/**/*.{js,jsx}"),
  ],
  theme: {
    extend: {
      // Using @canopy-iiif/ui preset brand (CSS variables).
      // Uncomment below to override with a custom palette.
      // colors: {
      //   brand: {
      //     DEFAULT: '#3b82f6',
      //     50:  '#eff6ff',
      //     100: '#dbeafe',
      //     200: '#bfdbfe',
      //     300: '#93c5fd',
      //     400: '#60a5fa',
      //     500: '#3b82f6',
      //     600: '#2563eb',
      //     700: '#1d4ed8',
      //     800: '#1e40af',
      //     900: '#1e3a8a',
      //   },
      //   muted: '#64748b', // slate-500
      // },
    },
  },
  corePlugins: {
    // preflight: false, // uncomment to disable base reset
  },
  plugins: [
    require("@canopy-iiif/app/ui/canopy-iiif-plugin"),
    plugin(function ({ addBase }) {
      if (!canopyTokenBase || !Object.keys(canopyTokenBase).length) return;
      addBase(canopyTokenBase);
    }),
  ],
  safelist: [
    // Add dynamic classes here if needed
  ],
};
