import React from 'react';
import getSafePageContext from './pageContext.js';

const PageContext = getSafePageContext();

export default function CanopyBrand(props = {}) {
  const {labelId, label: labelProp, href = '/', className, Logo} = props || {};
  const context = React.useContext(PageContext);
  const contextSiteTitle =
    context && context.site && typeof context.site.title === 'string'
      ? context.site.title.trim()
      : '';
  const normalizedLabel =
    typeof labelProp === 'string' && labelProp.trim() ? labelProp : '';
  const resolvedLabel = normalizedLabel || contextSiteTitle || 'Site title';
  const spanProps = labelId ? {id: labelId} : {};
  const classes = ['canopy-logo', className].filter(Boolean).join(' ');

  return (
    <a href={href} className={classes}>
      {typeof Logo === 'function' ? <Logo /> : null}
      <span {...spanProps}>{resolvedLabel}</span>
    </a>
  );
}
