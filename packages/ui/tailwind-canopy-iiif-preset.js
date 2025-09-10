/**
 * canopy-iiif-preset
 *
 * A Tailwind preset bundling Canopy UI design tokens and the
 * Canopy IIIF plugin for semantic component styles.
 */
module.exports = {
  theme: {
    container: { center: true, padding: "1rem" },
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
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Ubuntu",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
      },
      maxWidth: { content: "1200px", wide: "1440px" },
    },
  },
  plugins: [],
};
