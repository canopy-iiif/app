import React from "react";
// SSR-only: pulls featured helpers from the library (Node APIs inside)
import helpers from "../../../lib/components/featured.js";
import { computeHeroHeightStyle } from './hero-utils.js';

/**
 * Hero
 *
 * Full-width visual banner for a featured item.
 * - Fluid width (100% of container)
 * - Fixed height from `height` prop (no aspect ratio lock)
 * - Renders a background image from `item.thumbnail` with cover fit
 * - Title overlays with link to item.href
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

  const baseStyles = {
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

  return (
    <figure
      className={["canopy-hero", className].filter(Boolean).join(" ")}
      style={{ ...baseStyles, ...style }}
      {...(() => { const r = { ...rest }; try { delete r.random; delete r.index; } catch (_) {} return r; })()}
    >
      {thumbnail ? (
        <img src={thumbnail} alt="" aria-hidden="true" style={imgStyles} />
      ) : null}
      <h3>
        <a
          href={href}
          style={{ color: "inherit", textDecoration: "none" }}
          className="canopy-hero-link"
        >
          {title}
        </a>
      </h3>
    </figure>
  );
}
