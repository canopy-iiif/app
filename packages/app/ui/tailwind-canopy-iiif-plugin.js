/**
 * Canopy IIIF Tailwind plugin
 *
 * Provides semantic component styles for Canopy UI elements.
 * Users can disable these defaults by removing this plugin from
 * their Tailwind config.
 */
const plugin = require("tailwindcss/plugin");
const path = require("path");
const { loadCanopyTheme } = require("./theme");

function compileScss(filePath) {
  try {
    const sass = require("sass");
    const theme = loadCanopyTheme();
    const stylesRoot = path.join(__dirname, "styles");
    const loadPaths = [stylesRoot];
    const relModule = path
      .relative(stylesRoot, filePath)
      .replace(/\\/g, "/")
      .replace(/\.scss$/i, "");
    const source = `${theme && theme.sassConfig ? theme.sassConfig : ""}@use '${relModule}';`;
    const out = sass.compileString(source, { style: "expanded", loadPaths });
    return out && out.css ? out.css : "";
  } catch (e) {
    const message = e && e.message ? e.message : e;
    throw new Error(`Canopy UI: failed to compile ${filePath}: ${message}`);
  }
}

module.exports = plugin(function ({ addComponents, postcss }) {
  const entry = path.join(__dirname, 'styles', 'components', 'index.scss');
  const css = compileScss(entry);
  if (css && css.trim()) {
    const root = postcss && postcss.parse ? postcss.parse(css) : null;
    if (root) addComponents(root);
  }
});
