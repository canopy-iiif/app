const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

let remarkGfm = null;
try {
  const maybe = require('remark-gfm');
  remarkGfm = typeof maybe === 'function' ? maybe : maybe && maybe.default;
} catch (_) {
  remarkGfm = null;
}

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

const DEFAULT_STYLES = `:root {
  color-scheme: dark;
  --org-bg: #040306;
  --org-panel: rgba(8, 8, 12, 0.8);
  --org-text: #f5f2ff;
  --org-muted: rgba(245, 242, 255, 0.7);
  --org-accent: #a888ff;
  font-family: 'Inter', 'Sohne', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at 20% 20%, rgba(168, 136, 255, 0.25), transparent 45%),
    radial-gradient(circle at 80% 0%, rgba(105, 210, 255, 0.2), transparent 50%),
    var(--org-bg);
  color: var(--org-text);
  font-family: inherit;
  -webkit-font-smoothing: antialiased;
}
main.org-landing {
  width: min(1200px, calc(100% - 3rem));
  margin: 0 auto;
  padding: 5rem 0 6rem;
  display: flex;
  flex-direction: column;
  gap: 2.75rem;
}
@media (min-width: 768px) {
  main.org-landing {
    padding-top: 7rem;
    padding-bottom: 8rem;
  }
}
h1, h2, h3, h4, h5, h6 {
  margin: 0 0 1rem;
  font-weight: 600;
}
p {
  margin: 0 0 1.5rem;
  color: var(--org-muted);
  line-height: 1.7;
}
a {
  color: inherit;
  text-decoration: none;
}
.org-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.org-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.25rem;
  border-radius: 999px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 120ms ease, background 120ms ease;
}
.org-pill:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.16);
}
.org-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.org-card {
  background: var(--org-panel);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  padding: 1.5rem;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.4);
}
.org-card > span {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--org-muted);
}
.org-card strong {
  font-size: 1.25rem;
}
.org-card p {
  margin: 0;
  color: var(--org-muted);
}
.org-site-header,
.org-site-footer {
  width: min(1200px, calc(100% - 3rem));
  margin: 0 auto;
  padding: 1.5rem 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.95rem;
  color: var(--org-muted);
}
.org-site-header nav,
.org-site-footer nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.org-site-header a,
.org-site-footer a {
  color: inherit;
  opacity: 0.9;
}
.org-site-header a:hover,
.org-site-footer a:hover {
  opacity: 1;
}
.org-site-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 3rem;
  margin-top: 2rem;
}
`;

async function renderOrgIndex(mdxPath, outPath) {
  const raw = fs.readFileSync(mdxPath, 'utf8');
  const { data, content } = parseFrontmatter(raw);
  const { compile, run } = await import('@mdx-js/mdx');
  const runtime = await import('react/jsx-runtime');
  const { useMDXComponents: provider } = await import('@mdx-js/react');
  const useMDXComponents = typeof provider === 'function' ? provider : () => ({});
  const compileOptions = {
    outputFormat: 'function-body',
    development: false,
  };
  const remarkPlugins = [];
  if (remarkGfm) remarkPlugins.push(remarkGfm);
  if (remarkPlugins.length) compileOptions.remarkPlugins = remarkPlugins;

  async function compileComponent(source) {
    const compiled = await compile(source, compileOptions);
    const mod = await run(compiled, runtime, { useMDXComponents });
    return mod.default || mod.MDXContent || mod;
  }

  const Content = await compileComponent(content);
  let wrapped = React.createElement(Content, { frontmatter: data || {} });
  const appPath = path.join(path.dirname(mdxPath), '_app.mdx');
  if (fs.existsSync(appPath)) {
    const appRaw = fs.readFileSync(appPath, 'utf8');
    const { content: appSource } = parseFrontmatter(appRaw);
    if (appSource && appSource.trim()) {
      const App = await compileComponent(appSource);
      wrapped = React.createElement(App, { page: data || {} }, wrapped);
    }
  }
  const element = React.createElement(React.Fragment, null, wrapped);
  const body = ReactDOMServer.renderToStaticMarkup(element);
  const title = data && data.title ? String(data.title) : 'Canopy IIIF';
  const description = data && data.description ? String(data.description) : '';
  const lang = data && data.lang ? String(data.lang) : 'en';
  const bodyClass = data && data.bodyClass ? String(data.bodyClass) : '';
  const customStyles = data && typeof data.styles === 'string' ? data.styles : '';
  const styles = [DEFAULT_STYLES, customStyles].filter(Boolean).join('\n\n');
  const headExtra = data && typeof data.head === 'string' ? data.head : '';
  const stylesheetValues = Array.isArray(data && data.stylesheets)
    ? data.stylesheets
    : data && data.stylesheets
    ? [data.stylesheets]
    : [];
  const stylesheetTags = stylesheetValues
    .filter((href) => typeof href === 'string' && href.trim().length)
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}" />`)
    .join('\n    ');
  const html = `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    ${stylesheetTags}
    ${styles ? `<style>\n${styles}\n</style>` : ''}
    ${headExtra}
  </head>
  <body class="${bodyClass ? escapeHtml(bodyClass) : ''}">
    <main class="org-landing">
${body}
    </main>
  </body>
</html>`;
  fs.writeFileSync(outPath, html, 'utf8');
}

module.exports = {
  renderOrgIndex,
};
