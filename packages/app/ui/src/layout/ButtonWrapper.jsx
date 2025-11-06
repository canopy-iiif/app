import React from 'react';

export default function ButtonWrapper({ className = '', children, ...rest }) {
  const classes = ['canopy-button-group', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
