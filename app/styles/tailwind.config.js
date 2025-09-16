// Canopy defaults: design tokens + UI styles.
// To disable component styles, remove the plugin line.
// To disable Canopy tokens entirely, remove the preset line.
module.exports = {
  presets: [require("@canopy-iiif/app/ui/canopy-iiif-preset")],
  content: [
    "./content/**/*.{mdx,html}",
    "./site/**/*.html",
    "./packages/app/ui/**/*.{js,jsx,ts,tsx}",
    "./packages/app/lib/components/**/*.{js,jsx}",
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
  plugins: [require("@canopy-iiif/app/ui/canopy-iiif-plugin")],
  safelist: [
    // Add dynamic classes here if needed
  ],
};
