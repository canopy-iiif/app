/**
 * Canopy IIIF Tailwind plugin
 *
 * Provides semantic component styles for Canopy UI elements.
 * Users can disable these defaults by removing this plugin from
 * their Tailwind config.
 */
const plugin = require("tailwindcss/plugin");
const fs = require("fs");
const path = require("path");

function compileScss(filePath) {
  try {
    const sass = require("sass");
    const out = sass.compile(filePath, { style: "expanded" });
    return out && out.css ? out.css : "";
  } catch (e) {
    // No CSS fallback; if compilation fails, skip with an empty string.
    try { console.warn("Canopy UI: failed to compile", filePath, e && e.message ? e.message : e); } catch (_) {}
    return "";
  }
}

module.exports = plugin(function ({ addComponents, postcss }) {
  // Load component styles from SCSS partials stored alongside this plugin
  const stylesDir = path.join(__dirname, "styles", "components");
  let css = "";
  try {
    const files = fs.readdirSync(stylesDir).filter((f) => /\.scss$/i.test(f));
    for (const f of files) {
      const full = path.join(stylesDir, f);
      css += compileScss(full) + "\n";
    }
  } catch (_) {
    css = "";
  }
  if (css && postcss && postcss.parse) {
    addComponents(postcss.parse(css));
  }
});
