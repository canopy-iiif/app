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
  as: Element = 'a',
  ...rest
}) {
  const resolvedVariant = VARIANTS.has(variant) ? variant : 'primary';
  const computedRel =
    Element === 'a' && target === '_blank' && !rel ? 'noopener noreferrer' : rel;
  const content = children != null ? children : label;

  if (!content) return null;

  const classes = [
    'canopy-button',
    `canopy-button--${resolvedVariant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const elementProps = {
    className: classes,
    ...rest,
  };

  if (Element === 'a') {
    elementProps.href = href;
    if (target) elementProps.target = target;
    if (computedRel) elementProps.rel = computedRel;
  } else {
    if (typeof target !== 'undefined') elementProps.target = target;
    if (computedRel) elementProps.rel = computedRel;
  }

  return <Element {...elementProps}>{content}</Element>;
}
