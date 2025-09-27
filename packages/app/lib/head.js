const React = require('react');
const { withBase, rootRelativeHref } = require('./common');

const DEFAULT_STYLESHEET_PATH = '/styles/styles.css';

function stylesheetHref(href = DEFAULT_STYLESHEET_PATH) {
  const normalized = rootRelativeHref(href || DEFAULT_STYLESHEET_PATH);
  return withBase(normalized);
}

function Stylesheet(props = {}) {
  const { href = DEFAULT_STYLESHEET_PATH, rel = 'stylesheet', ...rest } = props;
  const resolved = stylesheetHref(href);
  return React.createElement('link', { rel, href: resolved, ...rest });
}

module.exports = {
  stylesheetHref,
  Stylesheet,
  DEFAULT_STYLESHEET_PATH,
};
