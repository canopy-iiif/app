import React from 'react';

const VARIANTS = new Set(['primary', 'secondary']);

export default function Button({
  label,
  href = '#',
  target,
  rel,
  variant = 'primary',
  className = '',
  children,
  ...rest
}) {
  const resolvedVariant = VARIANTS.has(variant) ? variant : 'primary';
  const computedRel =
    target === '_blank' && !rel ? 'noopener noreferrer' : rel;
  const content = children != null ? children : label;

  if (!content) return null;

  const classes = [
    'canopy-button',
    `canopy-button--${resolvedVariant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      href={href}
      className={classes}
      target={target}
      rel={computedRel}
      {...rest}
    >
      {content}
    </a>
  );
}
