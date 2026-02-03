const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { pathToFileURL } = require('url');

let remarkGfm = null;
try {
  const maybe = require('remark-gfm');
  remarkGfm = typeof maybe === 'function' ? maybe : maybe && maybe.default;
} catch (_) {
  remarkGfm = null;
}

const DEFAULT_DOCS_BASE = 'https://canopy-iiif.github.io/app';
const DEFAULT_ORG_BASE = 'https://canopy-iiif.github.io';

function parseFrontmatter(input) {
  let value = String(input || '');
  if (value.charCodeAt(0) === 0xfeff) value = value.slice(1);
  const match = value.match(/^(?:\s*\r?\n)*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) return { data: null, content: value };
  let data = null;
  try {
    data = yaml.load(match[1]) || null;
  } catch (_) {
    data = null;
  }
  const content = value.slice(match[0].length);
  return { data, content };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compileOptionsBase(filePath, overrides = {}) {
  const options = {
    outputFormat: 'function-body',
    development: false,
  };
  if (filePath) {
    try {
      options.baseUrl = pathToFileURL(filePath).href;
    } catch (_) {}
  }
  const remarkPlugins = [];
  if (remarkGfm) remarkPlugins.push(remarkGfm);
  if (overrides && Array.isArray(overrides.remarkPlugins)) {
    remarkPlugins.push(...overrides.remarkPlugins);
  }
  if (remarkPlugins.length) options.remarkPlugins = remarkPlugins;
  return options;
}

async function compileMdxModule(source, filePath, overrides) {
  const { compile, run } = await import('@mdx-js/mdx');
  const runtime = await import('react/jsx-runtime');
  const { useMDXComponents: provider } = await import('@mdx-js/react');
  const useMDXComponents = typeof provider === 'function' ? provider : () => ({});
  const compiled = await compile(source, compileOptionsBase(filePath, overrides));
  return run(compiled, runtime, { useMDXComponents });
}

function normalizeStylesheets(value) {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function resolveDocsStylesheetHref() {
  const base = String(process.env.CANOPY_BASE_URL || DEFAULT_DOCS_BASE).replace(/\/$/, '');
  return `${base}/styles/styles.css`;
}

function resolveOrgBaseUrl() {
  return String(process.env.ORG_SITE_BASE_URL || DEFAULT_ORG_BASE).replace(/\/$/, '');
}

async function renderOrgIndex(mdxPath, outPath) {
  const raw = fs.readFileSync(mdxPath, 'utf8');
  const { data, content } = parseFrontmatter(raw);
  const contentModule = await compileMdxModule(content, mdxPath);
  const Content = contentModule.default || contentModule.MDXContent || contentModule;

  const docsStylesheet = resolveDocsStylesheetHref();
  const orgBaseUrl = resolveOrgBaseUrl();
  const title = data && data.title ? String(data.title) : 'Canopy IIIF';
  const description = data && data.description ? String(data.description) : '';
  const lang = data && data.lang ? String(data.lang) : 'en';
  const bodyClass = data && data.bodyClass ? String(data.bodyClass) : '';
  const headExtra = data && typeof data.head === 'string' ? data.head : '';
  const extraStylesheets = normalizeStylesheets(data && data.stylesheets).filter(
    (href) => typeof href === 'string' && href.trim().length
  );

  const pageMeta = {
    title,
    description,
    url: orgBaseUrl || DEFAULT_ORG_BASE,
    canonical: orgBaseUrl || DEFAULT_ORG_BASE,
    type: 'website',
  };

  const appPath = path.join(path.dirname(mdxPath), '_app.mdx');
  if (!fs.existsSync(appPath)) {
    throw new Error('Missing required file: packages/helpers/org/root/_app.mdx');
  }
  const appRaw = fs.readFileSync(appPath, 'utf8');
  const { content: appSource } = parseFrontmatter(appRaw);
  if (!appSource || !appSource.trim()) {
    throw new Error('packages/helpers/org/root/_app.mdx must export App/Head components.');
  }
  const appModule = await compileMdxModule(appSource, appPath);
  const App = appModule.App || appModule.default || appModule.MDXContent || null;
  const Head = appModule.Head || null;
  if (!App) {
    throw new Error('packages/helpers/org/root/_app.mdx must export an App component.');
  }

  const contentTree = React.createElement(Content, { frontmatter: data || {} });
  const wrappedTree = React.createElement(App, { page: pageMeta }, contentTree);
  const bodyMarkup = ReactDOMServer.renderToStaticMarkup(wrappedTree);

  let headFromApp = '';
  if (Head) {
    try {
      headFromApp = ReactDOMServer.renderToStaticMarkup(
        React.createElement(Head, { page: pageMeta })
      );
    } catch (_) {
      headFromApp = '';
    }
  }

  const stylesheetTags = [docsStylesheet]
    .concat(extraStylesheets)
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}" />`)
    .join('\n    ');

  const schemaPayload = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: title,
    url: pageMeta.canonical,
  };
  const schemaJson = JSON.stringify(schemaPayload).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ''}
    <link rel="canonical" href="${escapeHtml(pageMeta.canonical)}" />
    ${stylesheetTags}
    <script type="application/ld+json">${schemaJson}</script>
    ${headFromApp}
    ${headExtra}
  </head>
  <body class="${bodyClass ? escapeHtml(bodyClass) : ''}">
${bodyMarkup}
  </body>
</html>`;
  fs.writeFileSync(outPath, html, 'utf8');
}

module.exports = {
  renderOrgIndex,
};
