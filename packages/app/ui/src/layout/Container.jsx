import React from 'react';

export default function Container({ className = '', children, ...rest }) {
  const classes = ['mx-auto', 'max-w-content', 'w-full', 'px-6', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
