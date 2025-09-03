import React from 'react';

/**
 * Responsive grid container.
 * - variant="masonry" uses CSS columns; good for uneven card heights.
 * - variant="auto" leaves layout to consumer (pass Tailwind or custom classes).
 *
 * Exposes CSS variables for easy overrides in site styles:
 * --grid-gap, --cols-base, --cols-md, --cols-lg
 */
export default function Grid({
  id,
  className = '',
  style = {},
  variant = 'masonry', // 'masonry' | 'grid' | 'auto'
  gap = '1rem',
  columns = { base: 1, md: 2, lg: 3 },
  children,
  ...rest
}) {
  const dataAttrs = variant === 'masonry' ? { 'data-grid-variant': 'masonry' } : {};
  const dataVariant = variant === 'grid' ? { 'data-grid-variant': 'grid' } : dataAttrs;
  const cssVars = (variant === 'masonry' || variant === 'grid')
    ? {
        '--grid-gap': gap,
        '--cols-base': String(columns?.base ?? 1),
        '--cols-md': String(columns?.md ?? 2),
        '--cols-lg': String(columns?.lg ?? 3),
      }
    : {};
  return (
    <div id={id} className={className} style={{ ...cssVars, ...style }} {...dataVariant} {...rest}>
      {children}
    </div>
  );
}
