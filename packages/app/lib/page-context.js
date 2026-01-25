const React = require('react');

const CONTEXT_KEY =
  typeof Symbol === 'function' ? Symbol.for('__CANOPY_PAGE_CONTEXT__') : '__CANOPY_PAGE_CONTEXT__';

function getGlobalRoot() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof global !== 'undefined') return global;
  if (typeof window !== 'undefined') return window;
  return {};
}

function getPageContext() {
  const root = getGlobalRoot();
  if (root[CONTEXT_KEY]) return root[CONTEXT_KEY];
  const ctx = React.createContext({ navigation: null, page: null, site: null });
  root[CONTEXT_KEY] = ctx;
  return ctx;
}

module.exports = {
  getPageContext,
  CONTEXT_KEY,
};
