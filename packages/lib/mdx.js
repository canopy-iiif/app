const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { pathToFileURL } = require('url');
const {
  fs,
  fsp,
  path,
  CONTENT_DIR,
  OUT_DIR,
  CACHE_DIR,
  ensureDirSync,
  withBase,
} = require('./common');
const yaml = require('js-yaml');

function parseFrontmatter(src) {
  let input = String(src || '');
  // Strip UTF-8 BOM if present
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  // Allow a few leading blank lines before frontmatter
  const m = input.match(/^(?:\s*\r?\n)*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!m) return { data: null, content: input };
  let data = null;
  try { data = yaml.load(m[1]) || null; } catch (_) { data = null; }
  const content = input.slice(m[0].length);
  return { data, content };
}

// ESM-only in v3; load dynamically from CJS
let MDXProviderCached = null;
async function getMdxProvider() {
  if (MDXProviderCached) return MDXProviderCached;
  try {
    const mod = await import('@mdx-js/react');
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
    const mod = await import('@canopy-iiif/ui');
    UI_COMPONENTS = mod || {};
  } catch (_) {
    UI_COMPONENTS = {};
  }
  return UI_COMPONENTS;
}

function extractTitle(mdxSource) {
  const { content } = parseFrontmatter(String(mdxSource || ''));
  const m = content.match(/^\s*#\s+(.+)\s*$/m);
  return m ? m[1].trim() : 'Untitled';
}

function isReservedFile(p) {
  const base = path.basename(p);
  return base.startsWith('_');
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
    const candidate = path.join(dir, '_layout.mdx');
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
  const appPath = path.join(CONTENT_DIR, '_app.mdx');
  if (!fs.existsSync(appPath)) {
    // Keep missing _app as a build-time error as specified
    throw new Error('Missing required file: content/_app.mdx');
  }
  const { compile } = await import('@mdx-js/mdx');
  const raw = await fsp.readFile(appPath, 'utf8');
  const { content: source } = parseFrontmatter(raw);
  let code = String(
    await compile(source, {
      jsx: false,
      development: false,
      providerImportSource: '@mdx-js/react',
      jsxImportSource: 'react',
      format: 'mdx',
    })
  );
  // MDX v3 default export (MDXContent) does not forward external children.
  // When present, expose the underlying layout function as __MDXLayout for wrapping.
  if (/\bconst\s+MDXLayout\b/.test(code) && !/export\s+const\s+__MDXLayout\b/.test(code)) {
    code += '\nexport const __MDXLayout = MDXLayout;\n';
  }
  ensureDirSync(CACHE_DIR);
  const tmpFile = path.join(CACHE_DIR, '_app.mjs');
  await fsp.writeFile(tmpFile, code, 'utf8');
  const mod = await import(pathToFileURL(tmpFile).href + `?v=${Date.now()}`);
  let App = mod.App || mod.__MDXLayout || mod.default || null;
  const Head = mod.Head || null;
  // Prefer a component that renders its children, but do not hard-fail if probe fails.
  let ok = false;
  try {
    const probe = React.createElement(App || (() => null), null, React.createElement('span', { 'data-canopy-probe': '1' }));
    const out = ReactDOMServer.renderToStaticMarkup(probe);
    ok = !!(out && out.indexOf('data-canopy-probe') !== -1);
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
      App = function PassThrough(props) { return React.createElement(React.Fragment, null, props.children); };
    }
    try { require('./log').log('! Warning: content/_app.mdx did not clearly render {children}; proceeding with best-effort wrapper\n', 'yellow'); } catch (_) { console.warn('Warning: content/_app.mdx did not clearly render {children}; proceeding.'); }
  }
  APP_WRAPPER = { App, Head };
  return APP_WRAPPER;
}

async function compileMdxFile(filePath, outPath, Layout, extraProps = {}) {
  const { compile } = await import('@mdx-js/mdx');
  const raw = await fsp.readFile(filePath, 'utf8');
  const { content: source } = parseFrontmatter(raw);
  const compiled = await compile(source, {
    jsx: false,
    development: false,
    providerImportSource: '@mdx-js/react',
    jsxImportSource: 'react',
    format: 'mdx',
  });
  const code = String(compiled);
  ensureDirSync(CACHE_DIR);
  const relCacheName =
    path
      .relative(CONTENT_DIR, filePath)
      .replace(/[\\/]/g, '_')
      .replace(/\.mdx$/i, '') + '.mjs';
  const tmpFile = path.join(CACHE_DIR, relCacheName);
  await fsp.writeFile(tmpFile, code, 'utf8');
  // Bust ESM module cache using source mtime
  let bust = '';
  try {
    const st = fs.statSync(filePath);
    bust = `?v=${Math.floor(st.mtimeMs)}`;
  } catch (_) {}
  const mod = await import(pathToFileURL(tmpFile).href + bust);
  const MDXContent = mod.default || mod.MDXContent || mod;
  const components = await loadUiComponents();
  let IIIFCard = null;
  try { IIIFCard = require('./components/IIIFCard'); } catch (_) { IIIFCard = null; }
  const MDXProvider = await getMdxProvider();
  // Base path support for anchors
  const Anchor = function A(props) {
    let { href = '', ...rest } = props || {};
    href = withBase(href);
    return React.createElement('a', { href, ...rest }, props.children);
  };
  const app = await loadAppWrapper();
  const dirLayout = await getNearestDirLayout(filePath);
  const contentNode = React.createElement(MDXContent, extraProps);
  const withLayout = dirLayout
    ? React.createElement(dirLayout, null, contentNode)
    : contentNode;
  const withApp = React.createElement(app.App, null, withLayout);
  const compMap = { ...components, a: Anchor };
  if (IIIFCard) compMap.IIIFCard = IIIFCard;
  const page = MDXProvider
    ? React.createElement(MDXProvider, { components: compMap }, withApp)
    : withApp;
  const body = ReactDOMServer.renderToStaticMarkup(page);
  const head = app && app.Head ? ReactDOMServer.renderToStaticMarkup(React.createElement(app.Head)) : '';
  return { body, head };
}

async function compileMdxToComponent(filePath) {
  const { compile } = await import('@mdx-js/mdx');
  const raw = await fsp.readFile(filePath, 'utf8');
  const { content: source } = parseFrontmatter(raw);
  const compiled = await compile(source, {
    jsx: false,
    development: false,
    providerImportSource: '@mdx-js/react',
    jsxImportSource: 'react',
    format: 'mdx',
  });
  const code = String(compiled);
  ensureDirSync(CACHE_DIR);
  const relCacheName =
    path
      .relative(CONTENT_DIR, filePath)
      .replace(/[\\/]/g, '_')
      .replace(/\.mdx$/i, '') + '.mjs';
  const tmpFile = path.join(CACHE_DIR, relCacheName);
  await fsp.writeFile(tmpFile, code, 'utf8');
  let bust = '';
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
  // Bundle a tiny browser runtime that hydrates Viewer placeholders using React.
  let esbuild = null;
  try {
    esbuild = require('../ui/node_modules/esbuild');
  } catch (_) {
    try { esbuild = require('esbuild'); } catch (_) {}
  }
  if (!esbuild) { try { require('./log').log('Hydration runtime skipped (no esbuild)\n', 'yellow', { dim: true }); } catch (_) {} return; }
  const entry = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import * as UI from '@canopy-iiif/ui';
    import CloverViewer from '@samvera/clover-iiif/viewer';
    function hydrateCanopy() {
      document.querySelectorAll('[data-canopy-hydrate]').forEach((el) => {
        if (el.__hydrated) return; el.__hydrated = true;
        const name = el.getAttribute('data-component') || '';
        const raw = el.getAttribute('data-props') || '';
        let props = {};
        try { props = raw ? JSON.parse(decodeURIComponent(raw)) : {}; } catch (_) {}
        let Comp = UI && UI[name];
        if (!Comp && (name === 'Viewer' || name === 'CloverViewer')) Comp = CloverViewer;
        if (!Comp) return;
        const root = createRoot(el);
        root.render(React.createElement(Comp, props));
      });
      document.querySelectorAll('[data-canopy-viewer]').forEach((el) => {
        if (el.__hydrated) return; el.__hydrated = true;
        const iiifContent = el.getAttribute('data-iiif-content') || '';
        const root = createRoot(el);
        root.render(React.createElement(CloverViewer, { iiifContent }));
      });
    }
    if (document.readyState !== 'loading') hydrateCanopy();
    else document.addEventListener('DOMContentLoaded', hydrateCanopy);
  `;
  ensureDirSync(OUT_DIR);
  const viewerOut = path.join(OUT_DIR, 'canopy-viewer.js');
  await esbuild.build({
    stdin: {
      contents: entry,
      resolveDir: process.cwd(),
      loader: 'js',
      sourcefile: 'canopy-viewer-entry.js',
    },
    outfile: viewerOut,
    platform: 'browser',
    format: 'iife',
    bundle: true,
    sourcemap: true,
    target: ['es2018'],
    logLevel: 'silent',
  });
  try {
    const { logLine } = require('./log');
    const { fs, path } = require('./common');
    let size = 0;
    try { const st = fs.statSync(viewerOut); size = st.size || 0; } catch (_) {}
    const kb = size ? ` (${(size/1024).toFixed(1)} KB)` : '';
    const rel = path.relative(process.cwd(), viewerOut).split(path.sep).join('/');
    logLine(`✓ Wrote ${rel}${kb}`,'cyan');
  } catch (_) {}
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
  resetMdxCaches: function() { try { DIR_LAYOUTS.clear(); } catch (_) {}; APP_WRAPPER = null; },
};
