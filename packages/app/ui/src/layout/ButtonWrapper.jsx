import React from 'react';

export default function ButtonWrapper({
  className = '',
  children,
  text = '',
  variant = 'default',
  ...rest
}) {
  const variantClass =
    variant && variant !== 'default'
      ? `canopy-button-group--${variant}`
      : '';
  const classes = ['canopy-button-group', variantClass, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {text && <span className="canopy-button-group__text">{text}</span>}
      <div className="canopy-button-group__actions">{children}</div>
    </div>
  );
}
