import React from 'react';

export default function CanopyBrand(props = {}) {
  const {
    labelId,
    label = 'Canopy IIIF',
    href = '/',
    className,
    Logo,
  } = props || {};
  const spanProps = labelId ? {id: labelId} : {};
  const classes = ['canopy-logo', className].filter(Boolean).join(' ');

  return (
    <a href={href} className={classes}>
      {typeof Logo === 'function' ? <Logo /> : null}
      <span {...spanProps}>{label}</span>
    </a>
  );
}
