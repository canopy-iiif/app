const React = require("react");
const ReactDOMServer = require("react-dom/server");
const mdx = require("../lib/build/mdx");
const {
  fs,
  fsp,
  path,
  OUT_DIR,
  ensureDirSync,
  cleanDir,
  htmlShell,
  rootRelativeHref,
} = require("../lib/common");
const {readBasePath} = require("../lib/base-path");
const {logLine} = require("../lib/build/log");

const STUDIO_DIR_NAME = "canopy-studio";
const STUDIO_ROOT = path.join(OUT_DIR, STUDIO_DIR_NAME);
const STUDIO_API_DIR = path.join(STUDIO_ROOT, "api", "studio");
const DASHBOARD_RUNTIME_PATH = path.join(__dirname, "dashboard-runtime.js");
const STUDIO_PREVIEW_ENTRY = path.join(STUDIO_ROOT, "draft-preview.js");
const esbuild = require("esbuild");
const {parseMdxImports} = require("./imports");

function describeStudioImport(entry) {
  const spec = entry && entry.specifier ? entry.specifier : "";
  if (!spec) return null;
  if (
    spec === "@canopy-iiif/app/ui" ||
    spec.startsWith("@canopy-iiif/app/ui/")
  ) {
    return {
      registryKey: "@canopy-iiif/app/ui",
      importPath: "@canopy-iiif/app/ui",
      type: "module",
    };
  }
  return {
    registryKey: spec,
    importPath: null,
    type: "stub",
  };
}

async function prepareStudioRoot() {
  await cleanDir(STUDIO_ROOT);
  ensureDirSync(STUDIO_API_DIR);
}

function normalizePagesForStudio(pageRecords) {
  const list = Array.isArray(pageRecords) ? pageRecords : [];
  const moduleSpecifiers = new Map();
  const pages = list.map((page) => {
    const href = rootRelativeHref(
      page && page.href
        ? page.href
        : page && page.outputPath
          ? page.outputPath
          : "/",
    );
    const cleanHref = href.replace(/^\/+/, "");
    const previewHref = rootRelativeHref(`${STUDIO_DIR_NAME}/${cleanHref}`);
    const sourcePath = page && page.sourcePath ? page.sourcePath : "";
    const sourceContent = (() => {
      if (!sourcePath) return "";
      const normalized = sourcePath.replace(/^\/+/, "");
      const absPath = path.join(
        "content",
        normalized.split("/").join(path.sep),
      );
      try {
        return fs.readFileSync(absPath, "utf8");
      } catch (_) {
        return "";
      }
    })();
    let parsedImports = [];
    try {
      const parsed = parseMdxImports(sourceContent, sourcePath);
      parsedImports = Array.isArray(parsed?.imports) ? parsed.imports : [];
      parsedImports = parsedImports.map((entry) => {
        const descriptor = describeStudioImport(entry);
        const resolvedKey = descriptor ? descriptor.registryKey : (entry && entry.resolvedKey ? entry.resolvedKey : entry?.specifier);
        if (descriptor && !moduleSpecifiers.has(descriptor.registryKey)) {
          moduleSpecifiers.set(descriptor.registryKey, descriptor);
        }
        return {
          ...entry,
          resolvedKey,
        };
      });
    } catch (_) {
      parsedImports = [];
    }
    return {
      title: page && page.title ? page.title : cleanHref || "Untitled page",
      href,
      previewHref,
      type: page && page.searchType ? page.searchType : "page",
      sourcePath,
      sourceContent,
      outputPath: page && page.outputPath ? page.outputPath : cleanHref,
      searchInclude: !!(page && page.searchInclude),
      summary: page && page.searchSummary ? page.searchSummary : "",
      summaryMarkdown:
        page && page.searchSummaryMarkdown ? page.searchSummaryMarkdown : "",
      imports: parsedImports.map((entry) => ({
        specifier: entry && entry.specifier ? entry.specifier : "",
        resolvedKey: entry && entry.resolvedKey ? entry.resolvedKey : (entry && entry.specifier ? entry.specifier : ""),
        members: Array.isArray(entry?.members)
          ? entry.members.map((member) => ({
              type: member && member.type ? member.type : "named",
              imported: member && member.imported ? member.imported : "",
              local: member && member.local ? member.local : member?.imported || "",
            }))
          : [],
        raw: entry && entry.raw ? entry.raw : "",
      })),
    };
  });
  return {pages, moduleSpecifiers};
}

async function writeStudioData(pageRecords) {
  const normalized = normalizePagesForStudio(pageRecords);
  const payload = {
    generatedAt: new Date().toISOString(),
    pages: normalized.pages,
  };
  const dest = path.join(STUDIO_API_DIR, "pages.json");
  await fsp.writeFile(dest, JSON.stringify(payload, null, 2), "utf8");
  return normalized.moduleSpecifiers;
}

const DASHBOARD_STYLES = `
  .canopy-studio body { background: var(--color-gray-950); color: var(--color-gray-50); }
  .canopy-studio * { box-sizing: border-box; }
  .canopy-studio-layout { display: flex; min-height: 100vh; }
  .canopy-studio-panel { width: 300px; background: var(--color-gray-900); padding: 2rem 1.5rem; border-right: 1px solid var(--color-gray-700); }
  .canopy-studio-panel h1 { margin: 0; font-size: 1.75rem; letter-spacing: 0.06em; color: var(--color-gray-50); }
  .canopy-studio-data { margin-top: 1rem; border-top: 1px solid var(--color-gray-700); padding-top: 1rem; font-size: 0.9rem; }
  .canopy-studio-data dt { text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.08em; color: var(--color-gray-300); margin: 0 0 0.25rem; }
  .canopy-studio-data dd { margin: 0 0 0.75rem; font-family: var(--font-mono); color: var(--color-gray-50); }
  .canopy-studio-actions { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .canopy-studio-actions button { width: 100%; border: none; border-radius: 0.5rem; padding: 0.65rem 0.85rem; font-weight: 600; cursor: pointer; background: var(--color-accent-default); color: var(--color-gray-50); }
  .canopy-studio-actions button[data-variant="secondary"] { background: var(--color-gray-800); color: var(--color-gray-100); }
  .canopy-studio-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
  .canopy-studio-status { font-size: 0.75rem; color: var(--color-gray-400); margin-top: 1rem; }
  .canopy-studio-preview { flex: 1; position: relative; background: var(--color-gray-950); }
  .canopy-studio-preview iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; background: var(--color-gray-50); }
  .canopy-studio-editor { position: absolute; inset: 0; display: none; flex-direction: column; gap: 0.75rem; padding: 1.25rem; background: var(--color-gray-950); }
  .canopy-studio-preview[data-mode="edit"] iframe { display: none; }
  .canopy-studio-preview[data-mode="edit"] .canopy-studio-editor { display: flex; }
  .canopy-studio-editor textarea { flex: 1; width: 100%; border-radius: 0.5rem; border: 1px solid var(--color-gray-700); background: var(--color-gray-900); color: var(--color-gray-50); font-family: var(--font-mono); padding: 1rem; resize: vertical; }
  .canopy-studio-editor__actions { display: flex; justify-content: flex-end; }
  .canopy-studio-editor button { border: none; border-radius: 0.5rem; padding: 0.6rem 0.75rem; font-weight: 600; cursor: pointer; background: var(--color-accent-default); color: var(--color-gray-50); }
  .canopy-studio-editor button:disabled { opacity: 0.4; cursor: not-allowed; }
  @media (max-width: 900px) {
    .canopy-studio-layout { flex-direction: column; }
    .canopy-studio-panel { width: 100%; border-right: none; border-bottom: 1px solid var(--color-gray-700); }
    .canopy-studio-preview { min-height: 60vh; }
  }
`;

async function renderAppHeadMarkup() {
  try {
    const wrapper = await mdx.loadAppWrapper();
    if (!wrapper || typeof wrapper.Head !== "function") return "";
    const tree = React.createElement(wrapper.Head, null);
    return ReactDOMServer.renderToStaticMarkup(tree);
  } catch (error) {
    try {
      logLine(
        `• Unable to render Head() from content/_app.mdx: ${
          error && error.message ? error.message : error
        }`,
        "yellow",
        {dim: true},
      );
    } catch (_) {}
    return "";
  }
}

async function buildDashboardHtml() {
  const basePath = readBasePath();
  const studioScriptHref = rootRelativeHref(`${STUDIO_DIR_NAME}/studio.js`);
  const previewSrc = rootRelativeHref("index.html");
  const dataEndpoint = rootRelativeHref(
    `${STUDIO_DIR_NAME}/api/studio/pages.json`,
  );
  const draftRuntimeHref = rootRelativeHref(
    `${STUDIO_DIR_NAME}/draft-preview.js`,
  );
  const sharedHead = await renderAppHeadMarkup();
  const sanitizeForScriptTag = (value) =>
    (value || "").replace(/<\/script/gi, '<\\/script');
  const headState = `<script type="application/json" id="canopy-studio-head">${JSON.stringify(sanitizeForScriptTag(sharedHead || ""))}</script>`;
  const headExtra = `${sharedHead || ""}${headState}<style>${DASHBOARD_STYLES}</style>`;
  const body = `
    <div class="canopy-studio-layout" id="canopy-studio-root" data-pages-endpoint="${dataEndpoint}" data-base-path="${basePath || ""}" data-preview-src="${previewSrc}" data-preview-runtime="${draftRuntimeHref}">
      <aside class="canopy-studio-panel">
        <h1>Canopy Studio</h1>
        <dl class="canopy-studio-data">
          <dt>Active page</dt>
          <dd data-studio-field="slug">—</dd>
          <dt>File path</dt>
          <dd data-studio-field="source">—</dd>
        </dl>
        <div class="canopy-studio-actions">
          <button type="button" data-studio-edit>Edit page</button>
        </div>
        <p class="canopy-studio-status" data-studio-status>Preparing studio…</p>
      </aside>
      <section class="canopy-studio-preview" data-studio-preview>
        <iframe title="Canopy Studio preview" src="${previewSrc}" data-studio-iframe></iframe>
        <div class="canopy-studio-editor" data-studio-editor>
          <textarea data-studio-editor-input placeholder="Markdown editor"></textarea>
          <div class="canopy-studio-editor__actions">
            <button type="button" data-studio-preview-draft>Update draft preview</button>
          </div>
        </div>
      </section>
    </div>
  `;
  return htmlShell({
    title: "Canopy Studio",
    body,
    cssHref: null,
    scriptHref: studioScriptHref,
    headExtra,
    bodyClass: "canopy-studio",
  });
}

function readDashboardRuntimeScript() {
  try {
    return fs.readFileSync(DASHBOARD_RUNTIME_PATH, "utf8");
  } catch (error) {
    try {
      logLine(
        `• Unable to read ${DASHBOARD_RUNTIME_PATH}: ${
          error && error.message ? error.message : error
        }`,
        "red",
        {dim: true},
      );
    } catch (_) {}
    return '(() => { console.error("[canopy-studio] Missing runtime script"); })();';
  }
}

async function buildDraftPreviewRuntime(moduleSpecifiers) {
  const modules = [];
  const seen = new Set();
  const registerModule = (entry) => {
    if (!entry) return;
    const key = entry.registryKey || entry.importPath || entry.specifier;
    if (!key || seen.has(key)) return;
    const importPath = entry.importPath || entry.specifier || key;
    seen.add(key);
    modules.push({registryKey: key, importPath, type: entry.type || "module"});
  };
  if (moduleSpecifiers && typeof moduleSpecifiers === "object") {
    if (moduleSpecifiers instanceof Map) {
      moduleSpecifiers.forEach((entry) => registerModule(entry));
    } else if (Array.isArray(moduleSpecifiers)) {
      moduleSpecifiers.forEach((entry) => registerModule(entry));
    }
  }
  registerModule({registryKey: "@canopy-iiif/app/ui", importPath: "@canopy-iiif/app/ui"});
  if (!modules.length) {
    modules.push({registryKey: "@canopy-studio/runtime-fallback", importPath: "react"});
  }
  const cacheDir = path.join(STUDIO_ROOT, ".cache");
  ensureDirSync(cacheDir);
  const entryFile = path.join(cacheDir, "draft-runtime-entry.js");
  const importLines = [];
  const registryLines = [];
  const realModules = modules.filter((mod) => mod.type !== "stub");
  const stubModules = modules.filter((mod) => mod.type === "stub");
  realModules.forEach((mod, index) => {
    const varName = `mod${index}`;
    let importPathValue = mod.importPath;
    if (!importPathValue) return;
    if (path.isAbsolute(importPathValue)) {
      let rel = path.relative(cacheDir, importPathValue);
      rel = rel.replace(/\\/g, "/");
      if (!rel.startsWith(".")) rel = `./${rel}`;
      importPathValue = rel;
    } else {
      importPathValue = importPathValue.replace(/\\/g, "/");
    }
    importLines.push(`import * as ${varName} from ${JSON.stringify(importPathValue)};`);
    registryLines.push(`${JSON.stringify(mod.registryKey)}: ${varName}`);
  });
  const stubLines = stubModules.map((mod, index) => {
    const varName = `stub${index}`;
    const label = mod.registryKey || 'component';
    registryLines.push(`${JSON.stringify(mod.registryKey)}: ${varName}`);
    return `const ${varName} = { default: function StudioPreviewStub(props) { return React.createElement('div', { style: { padding: '1rem', backgroundColor: '#0f172a', color: '#fff', borderRadius: '0.5rem', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', fontSize: '0.95rem' } }, 'Preview unavailable for ${label}'); } };`;
  });
  const entrySource = `import React from "react";
import {createRoot} from "react-dom/client";
import {MDXProvider} from "@mdx-js/react";
import {compile, run} from "@mdx-js/mdx";
import * as jsxRuntime from "react/jsx-runtime";

${importLines.join("\n")}
${stubLines.join("\n")}

const MODULE_REGISTRY = {
  ${registryLines.join(",\n  ")}
};

const FRONTMATTER_RE = /^---[\s\S]*?---\s*/;

function stripFrontmatter(source) {
  if (!source) return "";
  if (!source.startsWith("---")) return source;
  const match = source.match(FRONTMATTER_RE);
  if (!match) return source;
  return source.slice(match[0].length);
}

function cleanSource(source, imports) {
  let cleaned = stripFrontmatter(source || "");
  if (Array.isArray(imports)) {
    for (const entry of imports) {
      if (entry && entry.raw) {
        cleaned = cleaned.replace(entry.raw, "");
      }
    }
  }
  cleaned = cleaned.replace(/^export\s+default\s+/gm, "const __mdx_export_default = ");
  cleaned = cleaned.replace(/^export\s+\{[^}]+\};?$/gm, "");
  return cleaned;
}

function buildScope(imports) {
  const scope = {};
  if (!Array.isArray(imports)) return scope;
  for (const entry of imports) {
    const key = entry && entry.resolvedKey ? entry.resolvedKey : entry?.specifier;
    if (!key) continue;
    const mod = MODULE_REGISTRY[key] || {};
    const members = Array.isArray(entry?.members) ? entry.members : [];
    if (!members.length) {
      continue;
    }
    for (const member of members) {
      if (!member || !member.local) continue;
      if (member.type === "namespace") {
        scope[member.local] = mod;
        continue;
      }
      if (member.type === "default") {
        scope[member.local] = mod.default || mod;
        continue;
      }
      const importedName = member.imported || member.local;
      scope[member.local] = mod ? mod[importedName] : undefined;
    }
  }
  return scope;
}

async function renderDraft() {
  const payload = window.__CANOPY_STUDIO_DRAFT__ || {};
  const target = document.getElementById("canopy-studio-draft-root");
  if (!target) return;
  const source = typeof payload.source === "string" ? payload.source : "";
  const imports = Array.isArray(payload.imports) ? payload.imports : [];
  const cleaned = cleanSource(source, imports);
  const compiled = await compile(cleaned, {outputFormat: "function-body", development: false});
  const mod = await run(compiled, jsxRuntime);
  const Content = mod && (mod.default || mod.MDXContent || mod);
  const scope = buildScope(imports);
  const components = MODULE_REGISTRY["@canopy-iiif/app/ui"] || {};
  if (!Content) {
    target.innerHTML = '<p style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #fff;">Unable to render draft preview.</p>';
    return;
  }
  const element = React.createElement(
    MDXProvider,
    {components},
    React.createElement(Content, {...scope, components})
  );
  const root = createRoot(target);
  root.render(element);
}

renderDraft().catch((error) => {
  const target = document.getElementById("canopy-studio-draft-root");
  if (!target) return;
  target.innerHTML =
    '<pre style="color:#fff;background:#1f2937;padding:1rem;border-radius:0.5rem;">' +
    ((error && error.stack) || error || 'Preview error') +
    '</pre>';
});
`;
  await fsp.writeFile(entryFile, entrySource, "utf8");
  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2019",
    outfile: STUDIO_PREVIEW_ENTRY,
    define: {"process.env.NODE_ENV": JSON.stringify("development")},
  });
}

async function writeDashboardAssets() {
  const htmlPath = path.join(STUDIO_ROOT, "index.html");
  const scriptPath = path.join(STUDIO_ROOT, "studio.js");
  const html = await buildDashboardHtml();
  await Promise.all([
    fsp.writeFile(htmlPath, html, "utf8"),
    fsp.writeFile(scriptPath, readDashboardRuntimeScript(), "utf8"),
  ]);
}

async function deployStudioPrototype(options = {}) {
  const pageRecords = Array.isArray(options?.pageRecords)
    ? options.pageRecords
    : [];
  try {
    logLine("• Preparing /site/canopy-studio workspace", "blue", {dim: true});
  } catch (_) {}
  await prepareStudioRoot();
  const moduleSpecifiers = await writeStudioData(pageRecords);
  await buildDraftPreviewRuntime(moduleSpecifiers);
  await writeDashboardAssets();
  try {
    logLine("✓ Canopy Studio iframe dashboard ready", "green");
  } catch (_) {}
}

module.exports = {
  deployStudioPrototype,
  STUDIO_DIR_NAME,
  STUDIO_ROOT,
};
