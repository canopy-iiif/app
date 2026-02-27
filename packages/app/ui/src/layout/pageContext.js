import React from "react";

const CONTEXT_KEY =
  typeof Symbol === "function"
    ? Symbol.for("__CANOPY_PAGE_CONTEXT__")
    : "__CANOPY_PAGE_CONTEXT__";

function getSharedRoot() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return null;
}

export default function getSafePageContext() {
  const root = getSharedRoot();
  if (root && root[CONTEXT_KEY]) return root[CONTEXT_KEY];
  const ctx = React.createContext({navigation: null, page: null, site: null});
  if (root) root[CONTEXT_KEY] = ctx;
  return ctx;
}

export {CONTEXT_KEY};
