module.exports = {
  presets: [require('@canopy-iiif/ui/tailwind-preset')],
  content: [
    './content/**/*.{mdx,html}',
    './site/**/*.html',
    './packages/ui/**/*.{js,jsx,ts,tsx}',
    './packages/lib/components/**/*.{js,jsx}',
  ],
  theme: { extend: {} },
  corePlugins: {
    // preflight: false, // uncomment to disable base reset
  },
  plugins: [
    // Opt-in: require('@tailwindcss/typography'),
    // Opt-in: require('@tailwindcss/forms'),
  ],
  safelist: [
    // Add dynamic classes here if needed
  ],
};

