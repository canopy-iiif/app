const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { path, withBase } = require('./common');
const { ensureDirSync, OUT_DIR, htmlShell, fsp } = require('./common');

async function ensureSearchRuntime() {
  let esbuild = null;
  try { esbuild = require('../ui/node_modules/esbuild'); } catch (_) {
    try { esbuild = require('esbuild'); } catch (_) {}
  }
  if (!esbuild) return;
  const { BASE_PATH } = require('./common');
  const entry = `
    import FlexSearch from 'flexsearch';
    async function boot() {
      const res = await fetch('./search-index.json').catch(() => null);
      if (!res || !res.ok) return;
      const data = await res.json();
      const index = new FlexSearch.Index({ tokenize: 'forward' });
      const idToRec = new Map();
      data.forEach((rec, i) => { index.add(i, rec.title || ''); idToRec.set(i, rec); });
      const $ = (sel) => document.querySelector(sel);
      const input = $('#search-input');
      const resultsContainer = $('#search-results');
      const listAll = resultsContainer && resultsContainer.tagName === 'UL' ? resultsContainer : null;
      const countEl = $('#search-count');
      const summaryEl = $('#search-summary');
      const filtersEl = $('#search-filters');
      // Discover types and prepare filters dynamically
      const types = Array.from(new Set(data.map((r) => r && r.type ? String(r.type) : 'page')));
      const typeKey = (t) => String(t || 'page').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
      const typeFilters = new Map();
      types.forEach((t) => {
        const key = typeKey(t);
        const cbId = 'search-filter-' + key;
        let cb = document.getElementById(cbId);
        if (!cb && filtersEl) {
          const label = document.createElement('label');
          cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.id = cbId;
          cb.checked = true;
          label.appendChild(cb);
          label.appendChild(document.createTextNode(' ' + t.charAt(0).toUpperCase() + t.slice(1)));
          filtersEl.appendChild(label);
        }
        typeFilters.set(t, cb ? !!cb.checked : true);
        if (cb) cb.addEventListener('change', () => { typeFilters.set(t, !!cb.checked); search(input ? input.value : ''); });
      });
      let currentQuery = '';
      function render(ids) {
        // Group by type
        const grouped = new Map();
        (ids || []).forEach((i) => {
          const r = idToRec.get(i);
          if (!r) return;
          const esc = (s) => String(s||'').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
          var base = ${JSON.stringify(BASE_PATH)};
          var pref = base ? base : '';
          var href = (pref ? pref : '') + '/' + r.href;
          const li = '<li><a href="' + href + '">' + esc(r.title || r.href) + '</a></li>';
          const t = r.type || 'page';
          if (!grouped.has(t)) grouped.set(t, []);
          grouped.get(t).push(li);
        });
        // Try specific per-type lists if present
        let usedSpecific = false;
        grouped.forEach((items, t) => {
          const el = document.getElementById('search-results-' + typeKey(t));
          if (el) {
            usedSpecific = true;
            const enabled = typeFilters.get(t) !== false;
            el.innerHTML = enabled ? (items.join('') || '<li><em>No ' + t + ' results</em></li>') : '';
          }
        });
        // Count shown across enabled groups
        let shown = 0;
        grouped.forEach((items, t) => { if (typeFilters.get(t) !== false) shown += items.length; });
        if (!usedSpecific) {
          if (resultsContainer && resultsContainer.tagName !== 'UL') {
            const html = types.map((t) => {
              if (typeFilters.get(t) === false) return '';
              const items = grouped.get(t) || [];
              const title = t.charAt(0).toUpperCase() + t.slice(1);
              const lis = items.join('') || '<li><em>No ' + t + ' results</em></li>';
              return '<h2>' + title + '</h2><ul id="search-results-' + typeKey(t) + '">' + lis + '</ul>';
            }).join('');
            resultsContainer.innerHTML = html || '<p><em>No results</em></p>';
          } else if (listAll) {
            const combined = [];
            types.forEach((t) => { if (typeFilters.get(t) !== false) combined.push(...(grouped.get(t) || [])); });
            listAll.innerHTML = combined.join('') || '<li><em>No results</em></li>';
          }
        }
        if (countEl) countEl.textContent = String(shown);
        if (summaryEl) {
          const esc = (s) => String(s||'').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
          const total = data.length;
          if (currentQuery) {
            summaryEl.innerHTML = 'Found <strong>' + shown + '</strong> of ' + total + ' for \u201C' + esc(currentQuery) + '\u201D';
          } else {
            summaryEl.innerHTML = 'Showing <strong>' + shown + '</strong> of ' + total + ' items';
          }
        }
      }
      function showAll() { render(data.map((_, i) => i)); }
      function search(q) {
        if (!q) { currentQuery=''; showAll(); return; }
        currentQuery = q;
        const ids = index.search(q, { limit: 200 });
        render(Array.isArray(ids) ? ids : []);
      }
      const params = new URLSearchParams(location.search);
      const initial = params.get('q') || '';
      if (input) {
        input.value = initial;
        input.addEventListener('input', (e) => search(e.target.value));
      }
      // Filter events are wired when filters are created above
      if (initial) search(initial); else showAll();
    }
    if (document.readyState !== 'loading') boot();
    else document.addEventListener('DOMContentLoaded', boot);
  `;
  ensureDirSync(OUT_DIR);
  await esbuild.build({
    stdin: { contents: entry, resolveDir: process.cwd(), loader: 'js', sourcefile: 'search-entry.js' },
    outfile: path.join(OUT_DIR, 'search.js'),
    platform: 'browser',
    format: 'iife',
    bundle: true,
    sourcemap: true,
    target: ['es2018'],
    logLevel: 'silent',
  });
}

async function buildSearchPage() {
  try {
    const outPath = path.join(OUT_DIR, 'search.html');
    ensureDirSync(path.dirname(outPath));
    // Provide composable primitives for MDX layout: form + results
    const formEl = React.createElement(
      'div',
      null,
      React.createElement('input', {
        id: 'search-input',
        type: 'search',
        placeholder: 'Type to search…',
        style: { width: '100%', padding: '0.5rem', marginBottom: '0.5rem' },
      }),
      React.createElement('div', { id: 'search-filters', style: { display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' } })
    );
    const resultsEl = React.createElement('div', { id: 'search-results' });
    const countEl = React.createElement('span', { id: 'search-count' });
    const summaryEl = React.createElement('div', { id: 'search-summary' });

    // If a custom layout exists at content/search/_layout.mdx, render it
    const { CONTENT_DIR } = require('./common');
    const layoutPath = path.join(CONTENT_DIR, 'search', '_layout.mdx');
    let content = null;
    if (require('fs').existsSync(layoutPath)) {
      const { compileMdxToComponent } = require('./mdx');
      const Layout = await compileMdxToComponent(layoutPath);
      content = React.createElement(Layout, { search: { form: formEl, results: resultsEl, count: countEl, summary: summaryEl } });
    } else {
      // Fallback to a minimal hardcoded page
      content = React.createElement(
        'div',
        { className: 'search' },
        React.createElement('h1', null, 'Search'),
        React.createElement('p', null, 'Search the collection by title.'),
        formEl,
        React.createElement('p', null, 'Results: ', countEl),
        summaryEl,
        resultsEl
      );
    }

    // Wrap the page with MDXProvider so anchors in custom MDX Layout get base path
    let MDXProvider = null;
    try { const mod = await import('@mdx-js/react'); MDXProvider = mod.MDXProvider || mod.default || null; } catch (_) { MDXProvider = null; }
    const Anchor = function A(props) {
      let { href = '', ...rest } = props || {};
      href = withBase(href);
      return React.createElement('a', { href, ...rest }, props.children);
    };
    const compMap = { a: Anchor };
    const { loadAppWrapper } = require('./mdx');
    const app = await loadAppWrapper();
    const wrappedApp = app && app.App ? React.createElement(app.App, null, content) : content;
    const page = MDXProvider ? React.createElement(MDXProvider, { components: compMap }, wrappedApp) : wrappedApp;
    const body = ReactDOMServer.renderToStaticMarkup(page);
    const head = app && app.Head ? ReactDOMServer.renderToStaticMarkup(React.createElement(app.Head)) : '';
    const cssRel = path.relative(path.dirname(outPath), path.join(OUT_DIR, 'styles.css')).split(path.sep).join('/');
    const jsRel = path.relative(path.dirname(outPath), path.join(OUT_DIR, 'search.js')).split(path.sep).join('/');
    const html = htmlShell({ title: 'Search', body, cssHref: cssRel || 'styles.css', scriptHref: jsRel || 'search.js', headExtra: head });
    await fsp.writeFile(outPath, html, 'utf8');
    console.log('Search: Built', path.relative(process.cwd(), outPath));
  } catch (e) {
    console.warn('Search: Failed to build page', e.message);
  }
}

async function writeSearchIndex(records) {
  const idxPath = path.join(OUT_DIR, 'search-index.json');
  await fsp.writeFile(idxPath, JSON.stringify(records || [], null, 2), 'utf8');
}

module.exports = {
  ensureSearchRuntime,
  buildSearchPage,
  writeSearchIndex,
};
