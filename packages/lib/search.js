const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { path, withBase } = require('./common');
const { ensureDirSync, OUT_DIR, htmlShell, fsp } = require('./common');

async function ensureSearchRuntime() {
  const { fs, path, BASE_PATH } = require('./common');
  ensureDirSync(OUT_DIR);
  // Copy FlexSearch IIFE to site/
  let vendorSrc = null;
  try { vendorSrc = require.resolve('flexsearch/dist/flexsearch.light.min.js'); } catch (_) {}
  if (!vendorSrc) {
    console.warn('Search: FlexSearch vendor not found; skipping runtime');
    return;
  }
  const vendorDest = path.join(OUT_DIR, 'flexsearch.light.min.js');
  try { fs.copyFileSync(vendorSrc, vendorDest); } catch (e) {
    console.warn('Search: Failed to copy FlexSearch vendor:', e && e.message ? e.message : e);
    return;
  }
  try {
    const { logLine } = require('./log');
    const relVendor = path.relative(process.cwd(), vendorDest).split(path.sep).join('/');
    logLine(`✓ Wrote ${relVendor}`, 'cyan');
  } catch (_) {}
  const outFile = path.join(OUT_DIR, 'search.js');
  const base = String(BASE_PATH || '');
  const runtime = `/* Canopy prebundled search runtime */\n` +
`(function(){\n` +
`  var BASE = ${JSON.stringify(base)} || '';\n` +
`  function $(sel){ return document.querySelector(sel); }\n` +
`  function typeKey(t){ return String(t||'page').toLowerCase().replace(/[^a-z0-9_-]+/g,'-'); }\n` +
`  function loadFlex(cb){ if (window.FlexSearch){ cb&&cb(); return; } var s=document.createElement('script'); s.src='./flexsearch.light.min.js'; s.onload=function(){ cb&&cb(); }; s.onerror=function(){ cb&&cb(); }; document.head.appendChild(s);}\n` +
`  function buildWorkItem(rec, href){ var li=document.createElement('li'); li.className='search-result work'; var a=document.createElement('a'); a.href=href; a.className='card'; var fig=document.createElement('figure'); fig.style.margin='0'; if(rec.thumbnail){ var img=document.createElement('img'); img.src=String(rec.thumbnail||''); img.alt=String(rec.title||''); img.loading='lazy'; img.style.display='block'; img.style.width='100%'; img.style.height='auto'; img.style.borderRadius='4px'; fig.appendChild(img);} var fc=document.createElement('figcaption'); fc.style.marginTop='8px'; var strong=document.createElement('strong'); strong.textContent=String(rec.title||rec.href||''); fc.appendChild(strong); fig.appendChild(fc); a.appendChild(fig); li.appendChild(a); return li.outerHTML; }\n` +
`  function buildPageItem(rec, href){ var li=document.createElement('li'); li.className='search-result page'; var a=document.createElement('a'); a.href=href; a.textContent=String(rec.title||rec.href||''); li.appendChild(a); return li.outerHTML; }\n` +
`  function start(){ var input=$('#search-input'); var resultsContainer=$('#search-results'); var listAll=(resultsContainer&&resultsContainer.tagName==='UL')?resultsContainer:null; var countEl=$('#search-count'); var summaryEl=$('#search-summary'); var filtersEl=$('#search-filters');\n` +
`    fetch('./search-index.json').then(function(r){return r.ok?r.json():[]}).catch(function(){return[]}).then(function(data){ var index=new window.FlexSearch.Index({tokenize:'forward'}); var idToRec=new Map(); data.forEach(function(rec,i){ try{ index.add(i, (rec&&rec.title)?String(rec.title):''); }catch(e){} idToRec.set(i, rec||{}); }); var types=Array.from(new Set(data.map(function(r){ return (r&&r.type)?String(r.type):'page'; }))); var typeFilters=new Map(); types.forEach(function(t){ var key=typeKey(t); var cbId='search-filter-'+key; var cb=document.getElementById(cbId); if(!cb && filtersEl){ var label=document.createElement('label'); cb=document.createElement('input'); cb.type='checkbox'; cb.id=cbId; cb.checked=true; label.appendChild(cb); label.appendChild(document.createTextNode(' '+t.charAt(0).toUpperCase()+t.slice(1))); filtersEl.appendChild(label);} typeFilters.set(t, cb?!!cb.checked:true); if(cb) cb.addEventListener('change', function(){ typeFilters.set(t, !!cb.checked); search(input?input.value:''); }); }); var currentQuery=''; function render(ids){ var grouped=new Map(); (ids||[]).forEach(function(i){ var r=idToRec.get(i); if(!r) return; var href=(BASE?BASE:'') + '/' + r.href; var html=((r.type||'page')==='work' && r.thumbnail) ? buildWorkItem(r, href) : buildPageItem(r, href); var t=r.type||'page'; if(!grouped.has(t)) grouped.set(t, []); grouped.get(t).push(html); }); var shown=0; grouped.forEach(function(items,t){ if(typeFilters.get(t)!==false) shown+=items.length; }); var usedSpecific=false; grouped.forEach(function(items,t){ var el=document.getElementById('search-results-'+typeKey(t)); if(el){ usedSpecific=true; var enabled=(typeFilters.get(t)!==false); el.innerHTML= enabled ? (items.join('') || '<li><em>No '+t+' results</em></li>') : ''; }}); if(!usedSpecific){ if(resultsContainer && resultsContainer.tagName!=='UL'){ var html=types.map(function(t){ if(typeFilters.get(t)===false) return ''; var items=grouped.get(t)||[]; var title=t.charAt(0).toUpperCase()+t.slice(1); var lis=items.join('') || '<li><em>No '+t+' results</em></li>'; return '<h2>'+title+'</h2><ul id=\"search-results-'+typeKey(t)+'\">'+lis+'</ul>'; }).join(''); resultsContainer.innerHTML = html || '<p><em>No results</em></p>'; } else if (listAll){ var combined=[]; types.forEach(function(t){ if(typeFilters.get(t)!==false) combined.push.apply(combined, grouped.get(t)||[]); }); listAll.innerHTML = combined.join('') || '<li><em>No results</em></li>'; }} if(countEl) countEl.textContent=String(shown); if(summaryEl){ var total=data.length; summaryEl.textContent = currentQuery ? ('Found '+shown+' of '+total+' for “'+currentQuery+'”') : ('Showing '+shown+' of '+total+' items'); } } function showAll(){ render(data.map(function(_,i){return i;})); } function search(q){ if(!q){ currentQuery=''; showAll(); return; } currentQuery=q; var ids=index.search(q, { limit: 200 }); render(Array.isArray(ids)?ids:[]); } var params=new URLSearchParams(location.search); var initial=params.get('q')||''; if(input){ input.value=initial; input.addEventListener('input', function(e){ search(e.target.value); }); } if(initial) search(initial); else showAll(); }); }\n` +
`  if(document.readyState!=='loading') loadFlex(start); else document.addEventListener('DOMContentLoaded', function(){ loadFlex(start); });\n` +
`})();\n`;
  try { fs.writeFileSync(outFile, runtime, 'utf8'); } catch (e) { console.warn('Search: Failed to write runtime:', e && e.message ? e.message : e); return; }
  try {
    const { logLine } = require('./log');
    let size = 0; try { const st = fs.statSync(outFile); size = st.size || 0; } catch (_) {}
    const kb = size ? ` (${(size/1024).toFixed(1)} KB)` : '';
    const rel = path.relative(process.cwd(), outFile).split(path.sep).join('/');
    logLine(`✓ Wrote ${rel}${kb}`, 'cyan');
  } catch (_) {}
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
    let html = htmlShell({ title: 'Search', body, cssHref: cssRel || 'styles.css', scriptHref: jsRel || 'search.js', headExtra: head });
    try { html = require('./common').applyBaseToHtml(html); } catch (_) {}
    await fsp.writeFile(outPath, html, 'utf8');
    console.log('Search: Built', path.relative(process.cwd(), outPath));
  } catch (e) {
    console.warn('Search: Failed to build page', e.message);
  }
}

function toSafeString(val, fallback = '') {
  try { return String(val == null ? fallback : val); } catch (_) { return fallback; }
}

function sanitizeRecord(r) {
  const title = toSafeString(r && r.title, '');
  const href = toSafeString(r && r.href, '');
  const type = toSafeString(r && r.type, 'page');
  // Clamp very long titles to keep index small and robust
  const safeTitle = title.length > 300 ? title.slice(0, 300) + '…' : title;
  return { title: safeTitle, href, type };
}

async function writeSearchIndex(records) {
  const idxPath = path.join(OUT_DIR, 'search-index.json');
  const list = Array.isArray(records) ? records : [];
  const safe = list.map(sanitizeRecord);
  const json = JSON.stringify(safe, null, 2);
  // Warn if the index is unusually large (> 10MB)
  const approxBytes = Buffer.byteLength(json, 'utf8');
  if (approxBytes > 10 * 1024 * 1024) {
    console.warn('Search: index size is large (', Math.round(approxBytes / (1024 * 1024)), 'MB ). Consider narrowing sources.');
  }
  await fsp.writeFile(idxPath, json, 'utf8');
}

module.exports = {
  ensureSearchRuntime,
  buildSearchPage,
  writeSearchIndex,
};
