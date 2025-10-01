import React from "react";
// SSR-only: pulls featured helpers from the library (Node APIs inside)
import helpers from "../../../lib/components/featured.js";
import { computeHeroHeightStyle } from './hero-utils.js';

const basePath = (() => {
  try {
    const raw =
      typeof process !== "undefined" && process && process.env
        ? String(process.env.CANOPY_BASE_PATH || "")
        : "";
    return raw.replace(/\/$/, "");
  } catch (_) {
    return "";
  }
})();

function applyBasePath(href) {
  try {
    if (!href) return href;
    if (!basePath) return href;
    if (typeof href === "string" && href.startsWith("/")) {
      return `${basePath}${href}`;
    }
  } catch (_) {}
  return href;
}

/**
 * Hero
 *
 * Full-width visual banner for a featured item.
 * - Fluid width (100% of container)
 * - Fixed height from `height` prop (no aspect ratio lock)
 * - Renders a background image from `item.thumbnail` with cover fit
 * - Title rendered as caption beneath the hero and linked to item.href
 *
 * Props:
 * - height: number | string — required; e.g., 360 or '420px'
 * - item: { title, href, thumbnail } — required
 * - className, style — optional container overrides
 */
export default function Hero({
  height = 360,
  item,
  index,
  random,
  className = "",
  style = {},
  ...rest
}) {
  // Resolve item: prefer explicit prop, else pick from featured list.
  let resolved = item;
  if (!resolved) {
    const list =
      helpers && helpers.readFeaturedFromCacheSync
        ? helpers.readFeaturedFromCacheSync()
        : [];
    let idx = 0;
    if (typeof index === "number") {
      idx = Math.max(0, Math.min(list.length - 1, Math.floor(index)));
    } else if (random === true || random === "true") {
      idx = Math.floor(Math.random() * Math.max(1, list.length));
    }
    resolved = list[idx] || list[0] || null;
  }

  const hStyle = computeHeroHeightStyle(height);
  const title = (resolved && resolved.title) || "";
  const href = (resolved && resolved.href) || "#";
  const thumbnail = (resolved && resolved.thumbnail) || "";

  const mediaStyles = {
    position: "relative",
    ...hStyle,
    overflow: "hidden",
    backgroundColor: "var(--color-gray-muted)",
  };

  const imgStyles = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    filter: "none",
  };

  const sanitizedRest = (() => {
    const r = { ...rest };
    try {
      delete r.random;
      delete r.index;
    } catch (_) {}
    return r;
  })();

  const figureClassName = ["canopy-hero", className].filter(Boolean).join(" ");
  const figureStyles = { margin: 0, padding: 0, ...style };
  const safeHref = applyBasePath(href);

  return (
    <a href={safeHref} className="canopy-hero-link">
      <figure className={figureClassName} style={figureStyles} {...sanitizedRest}>
        <div className="canopy-hero__media" style={mediaStyles}>
          {thumbnail ? (
            <img src={thumbnail} alt="" aria-hidden="true" style={imgStyles} />
          ) : null}
        </div>
        {title ? <figcaption className="canopy-hero__caption">{title}</figcaption> : null}
      </figure>
    </a>
  );
}
