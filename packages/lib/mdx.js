const React = require("react");
const ReactDOMServer = require("react-dom/server");
const { pathToFileURL } = require("url");
const {
  fs,
  fsp,
  path,
  CONTENT_DIR,
  OUT_DIR,
  CACHE_DIR,
  ensureDirSync,
  withBase,
} = require("./common");
const yaml = require("js-yaml");

function parseFrontmatter(src) {
  let input = String(src || "");
  // Strip UTF-8 BOM if present
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  // Allow a few leading blank lines before frontmatter
  const m = input.match(/^(?:\s*\r?\n)*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!m) return { data: null, content: input };
  let data = null;
  try {
    data = yaml.load(m[1]) || null;
  } catch (_) {
    data = null;
  }
  const content = input.slice(m[0].length);
  return { data, content };
}

// ESM-only in v3; load dynamically from CJS
let MDXProviderCached = null;
async function getMdxProvider() {
  if (MDXProviderCached) return MDXProviderCached;
  try {
    const mod = await import("@mdx-js/react");
    MDXProviderCached = mod.MDXProvider || mod.default;
  } catch (_) {
    MDXProviderCached = null;
  }
  return MDXProviderCached;
}

// Lazily load UI components from the workspace package and cache them.
let UI_COMPONENTS = null;
async function loadUiComponents() {
  if (UI_COMPONENTS) return UI_COMPONENTS;
  try {
    const mod = await import("@canopy-iiif/ui");
    UI_COMPONENTS = mod || {};
  } catch (_) {
    UI_COMPONENTS = {};
  }
  return UI_COMPONENTS;
}

function extractTitle(mdxSource) {
  const { content } = parseFrontmatter(String(mdxSource || ""));
  const m = content.match(/^\s*#\s+(.+)\s*$/m);
  return m ? m[1].trim() : "Untitled";
}

function isReservedFile(p) {
  const base = path.basename(p);
  return base.startsWith("_");
}

// Cache for directory-scoped layouts
const DIR_LAYOUTS = new Map();
async function getNearestDirLayout(filePath) {
  const dirStart = path.dirname(filePath);
  let dir = dirStart;
  while (dir && dir.startsWith(CONTENT_DIR)) {
    const key = path.resolve(dir);
    if (DIR_LAYOUTS.has(key)) {
      const cached = DIR_LAYOUTS.get(key);
      if (cached) return cached;
    }
    const candidate = path.join(dir, "_layout.mdx");
    if (fs.existsSync(candidate)) {
      try {
        const Comp = await compileMdxToComponent(candidate);
        DIR_LAYOUTS.set(key, Comp);
        return Comp;
      } catch (_) {
        DIR_LAYOUTS.set(key, null);
      }
    } else {
      DIR_LAYOUTS.set(key, null);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

let APP_WRAPPER = null; // { App, Head } or null
async function loadAppWrapper() {
  if (APP_WRAPPER !== null) return APP_WRAPPER;
  const appPath = path.join(CONTENT_DIR, "_app.mdx");
  if (!fs.existsSync(appPath)) {
    // Keep missing _app as a build-time error as specified
    throw new Error("Missing required file: content/_app.mdx");
  }
  const { compile } = await import("@mdx-js/mdx");
  const raw = await fsp.readFile(appPath, "utf8");
  const { content: source } = parseFrontmatter(raw);
  let code = String(
    await compile(source, {
      jsx: false,
      development: false,
      providerImportSource: "@mdx-js/react",
      jsxImportSource: "react",
      format: "mdx",
    })
  );
  // MDX v3 default export (MDXContent) does not forward external children.
  // When present, expose the underlying layout function as __MDXLayout for wrapping.
  if (
    /\bconst\s+MDXLayout\b/.test(code) &&
    !/export\s+const\s+__MDXLayout\b/.test(code)
  ) {
    code += "\nexport const __MDXLayout = MDXLayout;\n";
  }
  ensureDirSync(CACHE_DIR);
  const tmpFile = path.join(CACHE_DIR, "_app.mjs");
  await fsp.writeFile(tmpFile, code, "utf8");
  const mod = await import(pathToFileURL(tmpFile).href + `?v=${Date.now()}`);
  let App = mod.App || mod.__MDXLayout || mod.default || null;
  const Head = mod.Head || null;
  // Prefer a component that renders its children, but do not hard-fail if probe fails.
  let ok = false;
  try {
    const probe = React.createElement(
      App || (() => null),
      null,
      React.createElement("span", { "data-canopy-probe": "1" })
    );
    const out = ReactDOMServer.renderToStaticMarkup(probe);
    ok = !!(out && out.indexOf("data-canopy-probe") !== -1);
  } catch (_) {
    ok = false;
  }
  if (!ok) {
    // If default export swallowed children, try to recover using __MDXLayout
    if (!App && mod.__MDXLayout) {
      App = mod.__MDXLayout;
    }
    // Fallback to pass-through wrapper to avoid blocking builds
    if (!App) {
      App = function PassThrough(props) {
        return React.createElement(React.Fragment, null, props.children);
      };
    }
    try {
      require("./log").log(
        "! Warning: content/_app.mdx did not clearly render {children}; proceeding with best-effort wrapper\n",
        "yellow"
      );
    } catch (_) {
      console.warn(
        "Warning: content/_app.mdx did not clearly render {children}; proceeding."
      );
    }
  }
  APP_WRAPPER = { App, Head };
  return APP_WRAPPER;
}

async function compileMdxFile(filePath, outPath, Layout, extraProps = {}) {
  const { compile } = await import("@mdx-js/mdx");
  const raw = await fsp.readFile(filePath, "utf8");
  const { content: source } = parseFrontmatter(raw);
  const compiled = await compile(source, {
    jsx: false,
    development: false,
    providerImportSource: "@mdx-js/react",
    jsxImportSource: "react",
    format: "mdx",
  });
  const code = String(compiled);
  ensureDirSync(CACHE_DIR);
  const relCacheName =
    path
      .relative(CONTENT_DIR, filePath)
      .replace(/[\\/]/g, "_")
      .replace(/\.mdx$/i, "") + ".mjs";
  const tmpFile = path.join(CACHE_DIR, relCacheName);
  await fsp.writeFile(tmpFile, code, "utf8");
  // Bust ESM module cache using source mtime
  let bust = "";
  try {
    const st = fs.statSync(filePath);
    bust = `?v=${Math.floor(st.mtimeMs)}`;
  } catch (_) {}
  const mod = await import(pathToFileURL(tmpFile).href + bust);
  const MDXContent = mod.default || mod.MDXContent || mod;
  const components = await loadUiComponents();
  const MDXProvider = await getMdxProvider();
  // Base path support for anchors
  const Anchor = function A(props) {
    let { href = "", ...rest } = props || {};
    href = withBase(href);
    return React.createElement("a", { href, ...rest }, props.children);
  };
  const app = await loadAppWrapper();
  const dirLayout = await getNearestDirLayout(filePath);
  const contentNode = React.createElement(MDXContent, extraProps);
  const withLayout = dirLayout
    ? React.createElement(dirLayout, null, contentNode)
    : contentNode;
  const withApp = React.createElement(app.App, null, withLayout);
  const compMap = { ...components, a: Anchor };
  const page = MDXProvider
    ? React.createElement(MDXProvider, { components: compMap }, withApp)
    : withApp;
  const body = ReactDOMServer.renderToStaticMarkup(page);
  const head =
    app && app.Head
      ? ReactDOMServer.renderToStaticMarkup(React.createElement(app.Head))
      : "";
  return { body, head };
}

async function compileMdxToComponent(filePath) {
  const { compile } = await import("@mdx-js/mdx");
  const raw = await fsp.readFile(filePath, "utf8");
  const { content: source } = parseFrontmatter(raw);
  const compiled = await compile(source, {
    jsx: false,
    development: false,
    providerImportSource: "@mdx-js/react",
    jsxImportSource: "react",
    format: "mdx",
  });
  const code = String(compiled);
  ensureDirSync(CACHE_DIR);
  const relCacheName =
    path
      .relative(CONTENT_DIR, filePath)
      .replace(/[\\/]/g, "_")
      .replace(/\.mdx$/i, "") + ".mjs";
  const tmpFile = path.join(CACHE_DIR, relCacheName);
  await fsp.writeFile(tmpFile, code, "utf8");
  let bust = "";
  try {
    const st = fs.statSync(filePath);
    bust = `?v=${Math.floor(st.mtimeMs)}`;
  } catch (_) {}
  const mod = await import(pathToFileURL(tmpFile).href + bust);
  return mod.default || mod.MDXContent || mod;
}

async function loadCustomLayout(defaultLayout) {
  // Deprecated: directory-scoped layouts handled per-page via getNearestDirLayout
  return defaultLayout;
}

async function ensureClientRuntime() {
  // Bundle a lightweight client runtime to hydrate browser-only components
  // like the Clover Viewer when placeholders are present in the HTML.
  let esbuild = null;
  try {
    esbuild = require("../ui/node_modules/esbuild");
  } catch (_) {
    try {
      esbuild = require("esbuild");
    } catch (_) {}
  }
  if (!esbuild) return;
  ensureDirSync(OUT_DIR);
  const scriptsDir = path.join(OUT_DIR, 'scripts');
  ensureDirSync(scriptsDir);
  const outFile = path.join(scriptsDir, "canopy-viewer.js");
  const entry = `
    import CloverViewer from '@samvera/clover-iiif/viewer';

    function ready(fn) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
      else fn();
    }

    function parseProps(el) {
      try {
        const s = el.querySelector('script[type="application/json"]');
        if (s) return JSON.parse(s.textContent || '{}');
        const raw = el.getAttribute('data-props') || '{}';
        return JSON.parse(raw);
      } catch (_) { return {}; }
    }

    ready(function() {
      try {
        const nodes = document.querySelectorAll('[data-canopy-viewer]');
        if (!nodes || !nodes.length) return;
        for (const el of nodes) {
          try {
            const props = parseProps(el);
            const React = (window && window.React) || null;
            const ReactDOMClient = (window && window.ReactDOMClient) || null;
            const createRoot = ReactDOMClient && ReactDOMClient.createRoot;
            if (!React || !createRoot) continue;
            const root = createRoot(el);
            root.render(React.createElement(CloverViewer, props));
          } catch (_) { /* skip */ }
        }
      } catch (_) { /* no-op */ }
    });
  `;
  const reactShim = `
    const React = (typeof window !== 'undefined' && window.React) || {};
    export default React;
    export const Children = React.Children;
    export const Component = React.Component;
    export const Fragment = React.Fragment;
    export const createElement = React.createElement;
    export const cloneElement = React.cloneElement;
    export const createContext = React.createContext;
    export const forwardRef = React.forwardRef;
    export const memo = React.memo;
    export const startTransition = React.startTransition;
    export const isValidElement = React.isValidElement;
    export const useEffect = React.useEffect;
    export const useLayoutEffect = React.useLayoutEffect;
    export const useMemo = React.useMemo;
    export const useState = React.useState;
    export const useRef = React.useRef;
    export const useCallback = React.useCallback;
    export const useContext = React.useContext;
    export const useReducer = React.useReducer;
    export const useId = React.useId;
  `;
  const rdomShim = `
    const ReactDOM = (typeof window !== 'undefined' && window.ReactDOM) || {};
    export default ReactDOM;
    export const render = ReactDOM.render;
    export const unmountComponentAtNode = ReactDOM.unmountComponentAtNode;
    export const findDOMNode = ReactDOM.findDOMNode;
  `;
  const rdomClientShim = `
    const RDC = (typeof window !== 'undefined' && window.ReactDOMClient) || {};
    export default RDC;
    export const createRoot = RDC.createRoot;
    export const hydrateRoot = RDC.hydrateRoot;
  `;
  const plugin = {
    name: 'canopy-react-shims',
    setup(build) {
      const ns = 'canopy-shim';
      build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: ns }));
      build.onResolve({ filter: /^react-dom$/ }, () => ({ path: 'react-dom', namespace: ns }));
      build.onResolve({ filter: /^react-dom\/client$/ }, () => ({ path: 'react-dom-client', namespace: ns }));
      build.onLoad({ filter: /^react$/, namespace: ns }, () => ({ contents: reactShim, loader: 'js' }));
      build.onLoad({ filter: /^react-dom$/, namespace: ns }, () => ({ contents: rdomShim, loader: 'js' }));
      build.onLoad({ filter: /^react-dom-client$/, namespace: ns }, () => ({ contents: rdomClientShim, loader: 'js' }));
    }
  };
  await esbuild.build({
    stdin: {
      contents: entry,
      resolveDir: process.cwd(),
      sourcefile: "canopy-viewer-entry.js",
      loader: "js",
    },
    outfile: outFile,
    platform: "browser",
    format: "iife",
    bundle: true,
    sourcemap: false,
    target: ["es2018"],
    logLevel: "silent",
    minify: true,
    plugins: [plugin],
  });
}

// Build a small React globals vendor for client-side React pages.
async function ensureReactGlobals() {
  let esbuild = null;
  try {
    esbuild = require("../ui/node_modules/esbuild");
  } catch (_) {
    try {
      esbuild = require("esbuild");
    } catch (_) {}
  }
  if (!esbuild) return;
  const { path } = require("./common");
  ensureDirSync(OUT_DIR);
  const scriptsDir = path.join(OUT_DIR, "scripts");
  ensureDirSync(scriptsDir);
  const vendorFile = path.join(scriptsDir, "react-globals.js");
  const globalsEntry = `
    import * as React from 'react';
    import * as ReactDOM from 'react-dom';
    import * as ReactDOMClient from 'react-dom/client';
    (function(){ try{ window.React = React; window.ReactDOM = ReactDOM; window.ReactDOMClient = ReactDOMClient; }catch(e){} })();
  `;
  await esbuild.build({
    stdin: {
      contents: globalsEntry,
      resolveDir: process.cwd(),
      loader: "js",
      sourcefile: "react-globals-entry.js",
    },
    outfile: vendorFile,
    platform: "browser",
    format: "iife",
    bundle: true,
    sourcemap: false,
    target: ["es2018"],
    logLevel: "silent",
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
  });
}

module.exports = {
  extractTitle,
  isReservedFile,
  parseFrontmatter,
  compileMdxFile,
  compileMdxToComponent,
  loadCustomLayout,
  loadAppWrapper,
  ensureClientRuntime,
  ensureReactGlobals,
  resetMdxCaches: function () {
    try {
      DIR_LAYOUTS.clear();
    } catch (_) {}
    APP_WRAPPER = null;
  },
};
