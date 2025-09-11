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
    // Use server-safe UI subset to avoid importing browser-only components
    const mod = await import("@canopy-iiif/ui/server");
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
  try {
    const { logLine } = require('./log');
    let size = 0; try { const st = fs.statSync(outFile); size = st && st.size || 0; } catch (_) {}
    const kb = size ? ` (${(size/1024).toFixed(1)} KB)` : '';
    const rel = path.relative(process.cwd(), outFile).split(path.sep).join('/');
    logLine(`✓ Wrote ${rel}${kb}`, 'cyan');
  } catch (_) {}
}

// Facets runtime: fetches /api/search/facets.json, picks a value per label (random from top 3),
// and renders a Slider for each.
async function ensureFacetsRuntime() {
  let esbuild = null;
  try { esbuild = require("../ui/node_modules/esbuild"); } catch (_) { try { esbuild = require("esbuild"); } catch (_) {} }
  ensureDirSync(OUT_DIR);
  const scriptsDir = path.join(OUT_DIR, 'scripts');
  ensureDirSync(scriptsDir);
  const outFile = path.join(scriptsDir, 'canopy-related-items.js');
  const entry = `
    function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
    function parseProps(el){ try{ const s=el.querySelector('script[type="application/json"]'); if(s) return JSON.parse(s.textContent||'{}'); }catch(_){ } return {}; }
    function rootBase(){
      try {
        var bp = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : '';
        if (bp && bp.charAt(bp.length - 1) === '/') return bp.slice(0, -1);
        return bp;
      } catch(_){ return ''; }
    }
    function pickRandomTop(values, topN){ const arr=(values||[]).slice().sort((a,b)=> (b.doc_count||0)-(a.doc_count||0) || String(a.value).localeCompare(String(b.value))); const n=Math.min(topN||3, arr.length); if(!n) return null; const i=Math.floor(Math.random()*n); return arr[i]; }
    function makeSliderPlaceholder(props){ try{ const el=document.createElement('div'); el.setAttribute('data-canopy-slider','1'); const s=document.createElement('script'); s.type='application/json'; s.textContent=JSON.stringify(props||{}); el.appendChild(s); return el; }catch(_){ return null; } }
    function slugify(s){ try{ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }catch(_){ return ''; } }
    function firstI18nString(x){ if(!x) return ''; if(typeof x==='string') return x; try{ const keys=Object.keys(x||{}); if(!keys.length) return ''; const arr=x[keys[0]]; if(Array.isArray(arr)&&arr.length) return String(arr[0]); }catch(_){ } return ''; }
    async function fetchManifestValues(iiif){ try{ const res = await fetch(iiif, { headers: { 'Accept': 'application/json' } }).catch(()=>null); if(!res||!res.ok) return null; const m = await res.json().catch(()=>null); if(!m) return null; const meta = Array.isArray(m.metadata)? m.metadata : []; const out = []; for (const entry of meta){ if(!entry) continue; const label = firstI18nString(entry.label); if(!label) continue; const vals = []; try { if (typeof entry.value === 'string') vals.push(entry.value); else { const obj = entry.value || {}; for (const k of Object.keys(obj)) { const arr = Array.isArray(obj[k]) ? obj[k] : []; for (const v of arr) if (v) vals.push(String(v)); } } } catch(_){} if (vals.length) out.push({ label, values: vals.map((v)=>({ value: v, valueSlug: slugify(v) })) }); }
      return out; } catch(_){ return null; } }
    async function getApiVersion(){
      try {
        const u = rootBase() + '/api/index.json';
        const res = await fetch(u).catch(()=>null);
        const j = res && res.ok ? await res.json().catch(()=>null) : null;
        return (j && typeof j.version === 'string') ? j.version : '';
      } catch(_) { return ''; }
    }
    ready(function(){
      const nodes = document.querySelectorAll('[data-canopy-related-items]');
      nodes.forEach(async (el) => {
        try {
          const props = parseProps(el) || {};
          const labelsFilter = Array.isArray(props.labels) ? props.labels.map(String) : null;
          const topN = Number(props.top || 3) || 3;
          const ver = await getApiVersion();
          const verQ = ver ? ('?v=' + encodeURIComponent(ver)) : '';
          const res = await fetch(rootBase() + '/api/search/facets.json' + verQ).catch(()=>null);
          if(!res || !res.ok) return;
          const json = await res.json().catch(()=>null);
          if(!Array.isArray(json)) return;
          // Build lookup for allowed labels and value slugs
          const allowedLabels = new Map(); // label -> { slug, values: Set(valueSlug) }
          json.forEach((f)=>{ if(!f||!f.label||!Array.isArray(f.values)) return; if(labelsFilter && !labelsFilter.includes(String(f.label))) return; const vs = new Set((f.values||[]).map((v)=> String((v && v.slug) || slugify(v && v.value)))); allowedLabels.set(String(f.label), { slug: f.slug || slugify(f.label), values: vs }); });

          const manifestIiif = props.iiifContent && String(props.iiifContent);
          if (manifestIiif) {
            const mv = await fetchManifestValues(manifestIiif);
            if (!mv || !mv.length) return;
            // For each label present on the manifest, choose ONE value at random (from values also present in the index)
            mv.forEach((entry) => {
              const allow = allowedLabels.get(String(entry.label));
              if (!allow) return; // skip labels not indexed
              const candidates = (entry.values || []).filter((vv) => allow.values.has(vv.valueSlug));
              if (!candidates.length) return;
              const pick = candidates[Math.floor(Math.random() * candidates.length)];
              const wrap = document.createElement('div');
              wrap.setAttribute('data-facet-label', entry.label);
              const ph = makeSliderPlaceholder({ iiifContent: rootBase() + '/api/facet/' + (allow.slug) + '/' + pick.valueSlug + '.json' + verQ });
              if (ph) wrap.appendChild(ph);
              el.appendChild(wrap);
            });
            return;
          }

          // Homepage/default mode: pick a random top value per allowed label
          const selected = [];
          json.forEach((f) => { if(!f || !f.label || !Array.isArray(f.values)) return; if(labelsFilter && !labelsFilter.includes(String(f.label))) return; const pick = pickRandomTop(f.values, topN); if(pick) selected.push({ label: f.label, labelSlug: f.slug || slugify(f.label), value: pick.value, valueSlug: (pick.slug) || slugify(pick.value) }); });
          selected.forEach((s) => {
            const wrap = document.createElement('div');
            wrap.setAttribute('data-facet-label', s.label);
            const ph = makeSliderPlaceholder({ iiifContent: rootBase() + '/api/facet/' + s.labelSlug + '/' + s.valueSlug + '.json' + verQ });
            if (ph) wrap.appendChild(ph);
            el.appendChild(wrap);
          });
        } catch(_) { }
      });
    });
  `;
  const shim = { name: 'facets-vanilla', setup(){} };
  if (esbuild) {
    try {
      await esbuild.build({ stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: 'canopy-facets-entry.js', loader: 'js' }, outfile: outFile, platform: 'browser', format: 'iife', bundle: true, sourcemap: false, target: ['es2018'], logLevel: 'silent', minify: true, plugins: [shim] });
    } catch(e){ try{ console.error('RelatedItems: bundle error:', e && e.message ? e.message : e); }catch(_){ }
      // Fallback: write the entry script directly so the file exists
      try { fs.writeFileSync(outFile, entry, 'utf8'); } catch(_){}
      return; }
    try { const { logLine } = require('./log'); let size=0; try{ const st = fs.statSync(outFile); size = st && st.size || 0; }catch(_){} const kb = size ? ` (${(size/1024).toFixed(1)} KB)` : ''; const rel = path.relative(process.cwd(), outFile).split(path.sep).join('/'); logLine(`✓ Wrote ${rel}${kb}`, 'cyan'); } catch(_){}
  } else {
    // No esbuild: write a non-bundled version (no imports used)
    try { fs.writeFileSync(outFile, entry, 'utf8'); } catch(_){}
  }
}

// Bundle a separate client runtime for the Clover Slider to keep payloads split.
async function ensureSliderRuntime() {
  let esbuild = null;
  try {
    esbuild = require("../ui/node_modules/esbuild");
  } catch (_) {
    try { esbuild = require("esbuild"); } catch (_) {}
  }
  if (!esbuild) return;
  ensureDirSync(OUT_DIR);
  const scriptsDir = path.join(OUT_DIR, 'scripts');
  ensureDirSync(scriptsDir);
  const outFile = path.join(scriptsDir, "canopy-slider.js");
  const entry = `
    import CloverSlider from '@samvera/clover-iiif/slider';
    import 'swiper/css';
    import 'swiper/css/navigation';
    import 'swiper/css/pagination';

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
    function mount(el){
      try{
        if (!el || el.getAttribute('data-canopy-slider-mounted')==='1') return;
        const React = (window && window.React) || null;
        const ReactDOMClient = (window && window.ReactDOMClient) || null;
        const createRoot = ReactDOMClient && ReactDOMClient.createRoot;
        if (!React || !createRoot) return;
        const props = parseProps(el);
        const root = createRoot(el);
        root.render(React.createElement(CloverSlider, props));
        el.setAttribute('data-canopy-slider-mounted','1');
      } catch(_){}
    }
    function scan(){
      try{ document.querySelectorAll('[data-canopy-slider]:not([data-canopy-slider-mounted="1"])').forEach(mount); }catch(_){ }
    }
    function observe(){
      try{
        const obs = new MutationObserver((muts)=>{
          const toMount = [];
          for (const m of muts){
            m.addedNodes && m.addedNodes.forEach((n)=>{
              if (!(n instanceof Element)) return;
              if (n.matches && n.matches('[data-canopy-slider]')) toMount.push(n);
              const inner = n.querySelectorAll ? n.querySelectorAll('[data-canopy-slider]') : [];
              inner && inner.forEach && inner.forEach((x)=> toMount.push(x));
            });
          }
          if (toMount.length) Promise.resolve().then(()=> toMount.forEach(mount));
        });
        obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
      }catch(_){ }
    }
    ready(function(){ scan(); observe(); });
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
  const rdomClientShim = `
    const RDC = (typeof window !== 'undefined' && window.ReactDOMClient) || {};
    export const createRoot = RDC.createRoot;
    export const hydrateRoot = RDC.hydrateRoot;
  `;
  const plugin = {
    name: 'canopy-react-shims-slider',
    setup(build) {
      const ns = 'canopy-shim';
      build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: ns }));
      build.onResolve({ filter: /^react-dom$/ }, () => ({ path: 'react-dom', namespace: ns }));
      build.onResolve({ filter: /^react-dom\/client$/ }, () => ({ path: 'react-dom-client', namespace: ns }));
      build.onLoad({ filter: /^react$/, namespace: ns }, () => ({ contents: reactShim, loader: 'js' }));
      build.onLoad({ filter: /^react-dom$/, namespace: ns }, () => ({ contents: "export default ((typeof window!=='undefined' && window.ReactDOM) || {});", loader: 'js' }));
      build.onLoad({ filter: /^react-dom-client$/, namespace: ns }, () => ({ contents: rdomClientShim, loader: 'js' }));
      // Inline imported CSS into a <style> tag at runtime so we don't need a separate CSS file
      build.onLoad({ filter: /\.css$/ }, (args) => {
        const fs = require('fs');
        let css = '';
        try { css = fs.readFileSync(args.path, 'utf8'); } catch (_) { css = ''; }
        const js = [
          `var css = ${JSON.stringify(css)};`,
          `(function(){ try { var s = document.createElement('style'); s.setAttribute('data-canopy-slider-css',''); s.textContent = css; document.head.appendChild(s); } catch (e) {} })();`,
          `export default css;`
        ].join('\n');
        return { contents: js, loader: 'js' };
      });
    }
  };
  try {
    await esbuild.build({
      stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: 'canopy-slider-entry.js', loader: 'js' },
      outfile: outFile,
      platform: 'browser',
      format: 'iife',
      bundle: true,
      sourcemap: false,
      target: ['es2018'],
      logLevel: 'silent',
      minify: true,
      plugins: [plugin],
    });
  } catch (e) {
    try { console.error('Slider: bundle error:', e && e.message ? e.message : e); } catch (_) {}
    return;
  }
  try {
    const { logLine } = require('./log');
    let size = 0; try { const st = fs.statSync(outFile); size = st && st.size || 0; } catch (_) {}
    const kb = size ? ` (${(size/1024).toFixed(1)} KB)` : '';
    const rel = path.relative(process.cwd(), outFile).split(path.sep).join('/');
    logLine(`✓ Wrote ${rel}${kb}`, 'cyan');
  } catch (_) {}
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
  ensureSliderRuntime,
  ensureFacetsRuntime,
  ensureReactGlobals,
  resetMdxCaches: function () {
    try {
      DIR_LAYOUTS.clear();
    } catch (_) {}
    APP_WRAPPER = null;
  },
};
