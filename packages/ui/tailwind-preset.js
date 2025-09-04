/**
 * Minimal Tailwind preset for Canopy.
 * Keep scales lean; allow downstream projects to extend.
 */
module.exports = {
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        muted: "#6b7280",
      },
      maxWidth: { content: "1200px" },
    },
  },
  corePlugins: {
    // Keep these minimal; users can override in their config
  },
  plugins: [
    // Users may opt-in to plugins in their own config to keep CSS small.
    // e.g., require('@tailwindcss/typography'), require('@tailwindcss/forms')
  ],
};
