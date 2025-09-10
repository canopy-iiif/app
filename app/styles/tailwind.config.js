// Canopy defaults: design tokens + UI styles.
// To disable component styles, remove the plugin line.
// To disable Canopy tokens entirely, remove the preset line.
module.exports = {
  presets: [require("@canopy-iiif/ui/canopy-iiif-preset")],
  content: [
    "./content/**/*.{mdx,html}",
    "./site/**/*.html",
    "./packages/ui/**/*.{js,jsx,ts,tsx}",
    "./packages/lib/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3a5bc7",
          50: "#f7f9ff",
          100: "#edf2fe",
          200: "#d2deff",
          300: "#abbdf9",
          400: "#8da4ef",
          500: "#3e63dd",
          600: "#3358d4",
          700: "#3a5bc7",
          800: "#1f2d5c",
          900: "#1a2140",
        },
        muted: "#60646C",
      },
    },
  },
  corePlugins: {
    // preflight: false, // uncomment to disable base reset
  },
  plugins: [require("@canopy-iiif/ui/canopy-iiif-plugin")],
  safelist: [
    // Add dynamic classes here if needed
  ],
};
