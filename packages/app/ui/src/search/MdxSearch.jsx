import React from 'react';
import SearchSummary from './SearchSummary.jsx';
import SearchTabs from './MdxSearchTabs.jsx';
import SearchResults from './MdxSearchResults.jsx';

export default function MdxSearch(props = {}) {
  const {
    layout,
    tabsProps = {},
    summaryProps = {},
    resultsProps = {},
    className = '',
    showTabs = true,
    showSummary = true,
    showResults = true,
    children,
  } = props || {};
  const resultsPayload =
    resultsProps && typeof resultsProps === 'object'
      ? { ...resultsProps }
      : {};
  if (typeof layout !== 'undefined' && layout !== null && !resultsPayload.layout) {
    resultsPayload.layout = layout;
  }
  const classes = ['canopy-search', className].filter(Boolean).join(' ');

  return (
    <section className={classes} data-canopy-search="1">
      {showTabs ? <SearchTabs {...tabsProps} /> : null}
      {showSummary ? <SearchSummary {...summaryProps} /> : null}
      {showResults ? <SearchResults {...resultsPayload} /> : null}
      {children || null}
    </section>
  );
}
