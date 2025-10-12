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
if (process.env.CANOPY_DEBUG_THEME) {
  console.log('[tailwind-config] loaded');
}
const plugin = require("tailwindcss/plugin");
const {loadCanopyTheme} = require("@canopy-iiif/app/ui/theme");

const toGlob = (...parts) => path.join(...parts).replace(/\\/g, "/");
const projectRoot = path.join(__dirname, "..", "..");
const canopyUiDist = path.dirname(require.resolve("@canopy-iiif/app/ui"));
const canopyUiRoot = path.dirname(canopyUiDist);
const canopyLibRoot = path.dirname(require.resolve("@canopy-iiif/app"));

function compileCanopyTokens() {
  const theme = loadCanopyTheme();
  if (theme && theme.css) return theme.css;
  try {
    const sass = require("sass");
    const entry = path.join(canopyUiRoot, "styles", "variables.emit.scss");
    const result = sass.compile(entry, {style: "expanded"});
    return result && result.css ? result.css : "";
  } catch (_) {
    return "";
  }
}

const canopyTokensCss = compileCanopyTokens();

module.exports = {
  presets: [require("@canopy-iiif/app/ui/canopy-iiif-preset")],
  content: [
    toGlob(projectRoot, "content/**/*.{mdx,html}"),
    toGlob(canopyUiDist, "**/*.{js,mjs,jsx,tsx}"),
    toGlob(canopyLibRoot, "iiif/components/**/*.{js,jsx}"),
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    // preflight: false, // uncomment to disable base reset
  },
  plugins: [
    require("@canopy-iiif/app/ui/canopy-iiif-plugin"),
    plugin(function ({ addBase, postcss }) {
      if (!canopyTokensCss || !canopyTokensCss.trim() || !postcss || !postcss.parse) {
        return;
      }
      if (process.env.CANOPY_DEBUG_THEME) {
        console.log('[tailwind-config] injecting theme tokens');
      }
      addBase(postcss.parse(canopyTokensCss));
    }),
  ],
  safelist: [
    // Add dynamic classes here if needed
  ],
};
