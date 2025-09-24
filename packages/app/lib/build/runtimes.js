
const { logLine } = require('./log');
const { fs, fsp, path, OUT_DIR, ensureDirSync } = require('../common');

async function prepareAllRuntimes() {
  const mdx = require('./mdx');
  try { await mdx.ensureClientRuntime(); } catch (_) {}
  try { if (typeof mdx.ensureSliderRuntime === 'function') await mdx.ensureSliderRuntime(); } catch (_) {}
  // Optional: Hero runtime is SSR-only by default; enable explicitly to avoid bundling Node deps in browser
  try {
    if (process.env.CANOPY_ENABLE_HERO_RUNTIME === '1' || process.env.CANOPY_ENABLE_HERO_RUNTIME === 'true') {
      if (typeof mdx.ensureHeroRuntime === 'function') await mdx.ensureHeroRuntime();
    }
  } catch (_) {}
  try { if (typeof mdx.ensureFacetsRuntime === 'function') await mdx.ensureFacetsRuntime(); } catch (_) {}
  try { if (typeof mdx.ensureReactGlobals === 'function') await mdx.ensureReactGlobals(); } catch (_) {}
  try { await ensureCommandFallback(); } catch (_) {}
  try { logLine('✓ Prepared client hydration runtimes', 'cyan', { dim: true }); } catch (_) {}
}

module.exports = { prepareAllRuntimes };

async function ensureCommandFallback() {
  const cmdOut = path.join(OUT_DIR, 'scripts', 'canopy-command.js');
  ensureDirSync(path.dirname(cmdOut));
  const fallback = `
      (function(){
        function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
        function parseProps(el){ try{ const s = el.querySelector('script[type="application/json"]'); if(s) return JSON.parse(s.textContent||'{}'); }catch(_){ } return {}; }
        function norm(s){ try{ return String(s||'').toLowerCase(); }catch(_){ return ''; } }
        function withBase(href){ try{ var bp = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : ''; if(!bp) return href; if(/^https?:/i.test(href)) return href; var clean = href.replace(/^\\/+/, ''); return (bp.endsWith('/') ? bp.slice(0,-1) : bp) + '/' + clean; } catch(_){ return href; } }
        function rootBase(){ try { var bp = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : ''; return bp && bp.endsWith('/') ? bp.slice(0,-1) : bp; } catch(_) { return ''; } }
        function isOnSearchPage(){ try{ var base=rootBase(); var p=String(location.pathname||''); if(base && p.startsWith(base)) p=p.slice(base.length); if(p.endsWith('/')) p=p.slice(0,-1); return p==='/search'; }catch(_){ return false; } }
        function createUI(host){ var rel=(function(){ try{ var w=host.querySelector('.relative'); return w||host; }catch(_){ return host; } })(); try{ var cs = window.getComputedStyle(rel); if(!cs || cs.position==='static') rel.style.position='relative'; }catch(_){ } var existing = rel.querySelector('[data-canopy-command-panel]'); if(existing) return existing; var panel=document.createElement('div'); panel.setAttribute('data-canopy-command-panel',''); panel.style.cssText='position:absolute;left:0;right:0;top:calc(100% + 4px);display:none;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.12);z-index:1000;overflow:auto;max-height:60vh;'; panel.innerHTML='<div id="cplist"></div>'; rel.appendChild(panel); return panel; }
        async function loadRecords(){ try{ var v=''; try{ var m = await fetch(rootBase() + '/api/index.json').then(function(r){return r&&r.ok?r.json():null;}).catch(function(){return null;}); v=(m&&m.version)||''; }catch(_){} var res = await fetch(rootBase() + '/api/search-index.json' + (v?('?v='+encodeURIComponent(v)):'')).catch(function(){return null;}); var j = res && res.ok ? await res.json().catch(function(){return[];}) : []; return Array.isArray(j) ? j : (j && j.records) || []; } catch(_){ return []; } }
        ready(async function(){ var host=document.querySelector('[data-canopy-command]'); if(!host) return; var cfg=parseProps(host)||{}; var maxResults = Number(cfg.maxResults||8)||8; var groupOrder = Array.isArray(cfg.groupOrder)?cfg.groupOrder:['work','page']; var onSearchPage = isOnSearchPage(); var panel=createUI(host); try{ var rel=host.querySelector('.relative'); if(rel && !onSearchPage) rel.setAttribute('data-canopy-panel-auto','1'); }catch(_){} if(onSearchPage){ panel.style.display='none'; } var list=panel.querySelector('#cplist'); var teaser = host.querySelector('[data-canopy-command-input]'); var input = teaser; if(!input){ input = document.createElement('input'); input.type='search'; input.placeholder = cfg.placeholder || 'Search…'; input.setAttribute('aria-label','Search'); input.style.cssText='display:block;width:100%;padding:8px 10px;border-bottom:1px solid #e5e7eb;outline:none;'; panel.insertBefore(input, list); }
        // Populate from ?q= URL param if present
        try {
          var sp = new URLSearchParams(location.search || '');
          var qp = sp.get('q');
          if (qp) input.value = qp;
        } catch(_) {}
        // Only inject a legacy trigger button if neither a trigger nor a teaser input exists
        try{ if(!host.querySelector('[data-canopy-command-trigger]') && !host.querySelector('[data-canopy-command-input]')){ var btn=document.createElement('button'); btn.type='button'; btn.setAttribute('data-canopy-command-trigger',''); btn.setAttribute('aria-label','Open search'); btn.className='inline-flex items-center gap-2 px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50'; var lbl=((cfg&&cfg.label)||(cfg&&cfg.buttonLabel)||'Search'); var sLbl=document.createElement('span'); sLbl.textContent=String(lbl); var sK=document.createElement('span'); sK.setAttribute('aria-hidden','true'); sK.className='text-slate-500'; sK.textContent='⌘K'; btn.appendChild(sLbl); btn.appendChild(sK); host.appendChild(btn); } }catch(_){ }
        var records = await loadRecords(); function render(items){ list.innerHTML=''; if(!items.length){ panel.style.display='none'; return; } var groups=new Map(); items.forEach(function(r){ var t=String(r.type||'page'); if(!groups.has(t)) groups.set(t, []); groups.get(t).push(r); }); function gl(t){ if(t==='work') return 'Works'; if(t==='page') return 'Pages'; return t.charAt(0).toUpperCase()+t.slice(1);} var ordered=[].concat(groupOrder.filter(function(t){return groups.has(t);})).concat(Array.from(groups.keys()).filter(function(t){return groupOrder.indexOf(t)===-1;})); ordered.forEach(function(t){ var hdr=document.createElement('div'); hdr.textContent=gl(t); hdr.style.cssText='padding:6px 12px;font-weight:600;color:#374151'; list.appendChild(hdr); groups.get(t).forEach(function(r){ var it=document.createElement('div'); it.setAttribute('data-canopy-item',''); it.tabIndex=0; it.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;outline:none;'; var thumb=(String(r.type||'')==='work' && r.thumbnail)?r.thumbnail:''; if(thumb){ var img=document.createElement('img'); img.src=thumb; img.alt=''; img.style.cssText='width:40px;height:40px;object-fit:cover;border-radius:4px'; it.appendChild(img);} var span=document.createElement('span'); span.textContent=r.title||r.href; it.appendChild(span); it.onmouseenter=function(){ it.style.background='#f8fafc'; }; it.onmouseleave=function(){ it.style.background='transparent'; }; it.onfocus=function(){ it.style.background='#eef2ff'; try{ it.scrollIntoView({ block: 'nearest' }); }catch(_){} }; it.onblur=function(){ it.style.background='transparent'; }; it.onclick=function(){ try{ window.location.href = withBase(String(r.href||'')); }catch(_){} panel.style.display='none'; }; list.appendChild(it); }); }); }
        function getItems(){ try{ return Array.prototype.slice.call(list.querySelectorAll('[data-canopy-item]')); }catch(_){ return []; } }
        function filterAndShow(q){ try{ var qq=norm(q); if(!qq){ try{ panel.style.display='block'; list.innerHTML=''; }catch(_){} return; } var out=[]; for(var i=0;i<records.length;i++){ var r=records[i]; var title=String((r&&r.title)||''); if(!title) continue; if(norm(title).indexOf(qq)!==-1) out.push(r); if(out.length>=maxResults) break; } render(out); }catch(_){} }
        input.addEventListener('input', function(){ if(onSearchPage){ try{ var ev = new CustomEvent('canopy:search:setQuery', { detail: { query: (input.value||'') } }); window.dispatchEvent(ev); }catch(_){ } return; } filterAndShow(input.value||''); });
        // Keyboard navigation: ArrowDown/ArrowUp to move through items; Enter to select
        input.addEventListener('keydown', function(e){
          if(e.key==='ArrowDown'){ e.preventDefault(); try{ var items=getItems(); if(items.length){ panel.style.display='block'; items[0].focus(); } }catch(_){} }
          else if(e.key==='ArrowUp'){ e.preventDefault(); try{ var items2=getItems(); if(items2.length){ panel.style.display='block'; items2[items2.length-1].focus(); } }catch(_){} }
        });
        list.addEventListener('keydown', function(e){
          var cur = e.target && e.target.closest && e.target.closest('[data-canopy-item]');
          if(!cur) return;
          if(e.key==='ArrowDown'){
            e.preventDefault();
            try{ var arr=getItems(); var i=arr.indexOf(cur); var nxt=arr[Math.min(arr.length-1, i+1)]||cur; nxt.focus(); }catch(_){}
          } else if(e.key==='ArrowUp'){
            e.preventDefault();
            try{ var arr2=getItems(); var i2=arr2.indexOf(cur); if(i2<=0){ input && input.focus && input.focus(); } else { var prv=arr2[i2-1]; (prv||cur).focus(); } }catch(_){}
          } else if(e.key==='Enter'){
            e.preventDefault(); try{ cur.click(); }catch(_){}
          } else if(e.key==='Escape'){
            panel.style.display='none'; try{ input && input.focus && input.focus(); }catch(_){}
          }
        });
        document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ panel.style.display='none'; }});
        document.addEventListener('mousedown', function(e){ try{ if(!panel.contains(e.target) && !host.contains(e.target)){ panel.style.display='none'; } }catch(_){} });
        // Hotkey support (e.g., mod+k)
        document.addEventListener('keydown', function(e){
          try {
            var want = String((cfg && cfg.hotkey) || '').toLowerCase();
            if (!want) return;
            var isMod = e.metaKey || e.ctrlKey;
            if ((want === 'mod+k' || want === 'cmd+k' || want === 'ctrl+k') && isMod && (e.key === 'k' || e.key === 'K')) {
              e.preventDefault();
              if(onSearchPage){ try{ var ev2 = new CustomEvent('canopy:search:setQuery', { detail: { hotkey: true } }); window.dispatchEvent(ev2); }catch(_){ } return; }
              panel.style.display='block';
              (input && input.focus && input.focus());
              filterAndShow(input && input.value || '');
          }
          } catch(_) { }
        });
        function openPanel(){ if(onSearchPage){ try{ var ev3 = new CustomEvent('canopy:search:setQuery', { detail: {} }); window.dispatchEvent(ev3); }catch(_){ } return; } panel.style.display='block'; (input && input.focus && input.focus()); filterAndShow(input && input.value || ''); }
        host.addEventListener('click', function(e){ var trg=e.target && e.target.closest && e.target.closest('[data-canopy-command-trigger]'); if(trg){ e.preventDefault(); openPanel(); }});
        var btn = document.querySelector('[data-canopy-command-trigger]'); if(btn){ btn.addEventListener('click', function(){ openPanel(); }); }
        try{ var teaser2 = host.querySelector('[data-canopy-command-input]'); if(teaser2){ teaser2.addEventListener('focus', function(){ openPanel(); }); } }catch(_){}
      });
    })();
      `;
  await fsp.writeFile(cmdOut, fallback, 'utf8');
  try { logLine(`✓ Wrote ${path.relative(process.cwd(), cmdOut)} (fallback)`, 'cyan'); } catch (_) {}
}

async function prepareSearchRuntime(timeoutMs = 10000, label = '') {
  const search = require('../search/search');
  try { logLine(`• Writing search runtime${label ? ' ('+label+')' : ''}...`, 'blue', { bright: true }); } catch (_) {}
  let timedOut = false;
  await Promise.race([
    search.ensureSearchRuntime(),
    new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, Number(timeoutMs)))
  ]).catch(() => {
    try { console.warn(`Search: Bundling runtime timed out${label ? ' ('+label+')' : ''}, skipping`); } catch (_) {}
  });
  if (timedOut) {
    try { logLine(`! Search runtime not bundled${label ? ' ('+label+')' : ''}\n`, 'yellow'); } catch (_) {}
  }
}

module.exports = { prepareAllRuntimes, ensureCommandFallback, prepareSearchRuntime };
