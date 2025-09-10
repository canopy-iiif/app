/**
 * Canopy IIIF Tailwind plugin
 *
 * Provides semantic component styles for Canopy UI elements.
 * Users can disable these defaults by removing this plugin from
 * their Tailwind config.
 */
const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addComponents }) {
  addComponents({
    ".canopy-card": {
      display: "block",
      textDecoration: "none",
      color: "inherit",
    },
    ".canopy-card figure": {
      margin: "0",
    },
    ".canopy-card .canopy-card-media": {
      position: "relative",
      width: "100%",
      paddingBottom: "var(--canopy-card-padding, 100%)",
      backgroundColor: "rgb(229 231 235)", // slate-200
      borderRadius: "0.25rem",
      overflow: "hidden",
    },
    ".canopy-card .canopy-card-media > img": {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      opacity: "0",
      transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    '.canopy-card[data-image-loaded="true"] .canopy-card-media > img': {
      opacity: "1",
    },
    ".canopy-card .canopy-card-image": {
      display: "block",
      width: "100%",
      height: "auto",
      borderRadius: "0.25rem",
      opacity: "0",
      transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    '.canopy-card[data-image-loaded="true"] .canopy-card-image': {
      opacity: "1",
    },
    ".canopy-card figcaption": {
      marginTop: "0.5rem",
    },
    ".canopy-card figcaption > span:first-child": {
      display: "block",
    },
    ".canopy-card figcaption > span + span": {
      display: "block",
      color: "rgb(100 116 139)", // slate-500
    },
  });
});
