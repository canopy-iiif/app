/**
 * canopy-iiif-preset
 *
 * A Tailwind preset that sources design tokens (colors, fonts, sizes, etc.)
 * from Sass under packages/ui/styles, injects them as CSS variables, and maps
 * Tailwind theme.extend values to those variables for easy use in utilities.
 */
const plugin = require("tailwindcss/plugin");
const fs = require("fs");
const path = require("path");

function compileVarsCss() {
  try {
    const sass = require("sass");
    const entry = path.join(__dirname, "styles", "variables.emit.scss");
    const out = sass.compile(entry, { style: "expanded" });
    return out && out.css ? out.css : "";
  } catch (_) {
    return "";
  }
}

module.exports = {
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand-default)",
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          200: "var(--color-brand-200)",
          300: "var(--color-brand-300)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
          900: "var(--color-brand-900)",
        },
        gray: {
          DEFAULT: "var(--color-gray-default)",
          50: "var(--color-gray-50)",
          100: "var(--color-gray-100)",
          200: "var(--color-gray-200)",
          300: "var(--color-gray-300)",
          400: "var(--color-gray-400)",
          500: "var(--color-gray-500)",
          600: "var(--color-gray-600)",
          700: "var(--color-gray-700)",
          800: "var(--color-gray-800)",
          900: "var(--color-gray-900)",
        },
        slate: {
          DEFAULT: "var(--color-gray-default)",
          50: "var(--color-gray-50)",
          100: "var(--color-gray-100)",
          200: "var(--color-gray-200)",
          300: "var(--color-gray-300)",
          400: "var(--color-gray-400)",
          500: "var(--color-gray-500)",
          600: "var(--color-gray-600)",
          700: "var(--color-gray-700)",
          800: "var(--color-gray-800)",
          900: "var(--color-gray-900)",
        },
        muted: "var(--color-gray-muted)",
        white: "#ffffff",
        black: "#000000",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "var(--line-height-xs)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--line-height-sm)" }],
        base: [
          "var(--font-size-base)",
          { lineHeight: "var(--line-height-base)" },
        ],
        lg: ["var(--font-size-lg)", { lineHeight: "var(--line-height-lg)" }],
        xl: ["var(--font-size-xl)", { lineHeight: "var(--line-height-xl)" }],
        "2xl": [
          "var(--font-size-2xl)",
          { lineHeight: "var(--line-height-2xl)" },
        ],
        "3xl": [
          "var(--font-size-3xl)",
          { lineHeight: "var(--line-height-3xl)" },
        ],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-default)",
        md: "var(--radius-md)",
      },
      maxWidth: { content: "var(--max-w-content)", wide: "var(--max-w-wide)" },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionDuration: {
        canopyFast: "var(--duration-fast)",
      },
      transitionTimingFunction: {
        canopy: "var(--easing-standard)",
      },
    },
  },
  plugins: [
    // Inject CSS variables (tokens) derived from Sass variables
    plugin(function ({ addBase, postcss }) {
      const css = compileVarsCss();
      if (css && postcss && postcss.parse) addBase(postcss.parse(css));
    }),
  ],
};
