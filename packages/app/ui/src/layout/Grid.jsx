import Masonry from "react-masonry-css";
import React from "react";

// Simple item wrapper to provide consistent spacing between items.
export function GridItem({children, className = "", style = {}, ...rest}) {
  return (
    <div
      className={`canopy-grid-item ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Grid (Masonry)
 *
 * Lightweight wrapper around `react-masonry-css` with sensible defaults
 * and inline styles so it works without a global CSS pipeline.
 *
 * Props:
 * - breakpointCols: number | object — columns per breakpoint (react-masonry-css prop)
 * - gap: CSS length string — spacing between items/columns (default '1rem')
 * - paddingY: CSS length string — vertical padding for the grid (default '0')
 * - className, style — forwarded to container
 * - columnClassName — forwarded to Masonry (defaults to 'canopy-grid-column')
 * - children — usually a list of <GridItem> elements
 */
export default function Grid({
  breakpointCols,
  gap = "1.618rem",
  paddingY = "0",
  className = "",
  style = {},
  columnClassName = "canopy-grid-column",
  children,
  ...rest
}) {
  const cols = breakpointCols || {
    default: 6,
    1280: 5,
    1024: 4,
    768: 3,
    640: 2,
  };
  const vars = {"--grid-gap": gap, "--grid-padding-y": paddingY};

  return (
    <div className="canopy-grid-wrap">
      {/* Scoped styles so the component works standalone */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            .canopy-grid { display: flex; width: auto; position: relative; padding: var(--grid-padding-y, 0) 0; z-index: 1; }
            .canopy-grid .${columnClassName} { margin-left: var(--grid-gap, 1rem); }
            .canopy-grid .${columnClassName}:first-child { margin-left: 0; }
            .canopy-grid-item { margin-bottom: var(--grid-gap, 1rem); }
          `,
        }}
      />
      <Masonry
        breakpointCols={cols}
        className={`canopy-grid ${className}`.trim()}
        columnClassName={columnClassName}
        style={{...vars, ...style}}
        {...rest}
      >
        {children}
      </Masonry>
    </div>
  );
}
