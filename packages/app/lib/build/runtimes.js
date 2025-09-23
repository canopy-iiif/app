
const { logLine } = require('./log');
const { fs, fsp, path, OUT_DIR, ensureDirSync } = require('../common');

async function prepareAllRuntimes() {
  const mdx = require('./mdx');
  try { await mdx.ensureClientRuntime(); } catch (_) {}
  try { if (typeof mdx.ensureSliderRuntime === 'function') await mdx.ensureSliderRuntime(); } catch (_) {}
  try { if (typeof mdx.ensureHeroRuntime === 'function') await mdx.ensureHeroRuntime(); } catch (_) {}
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
        function createUI(){ var root=document.createElement('div'); root.setAttribute('data-canopy-command-fallback',''); root.style.cssText='position:fixed;inset:0;display:none;align-items:flex-start;justify-content:center;background:rgba(0,0,0,0.3);z-index:9999;padding-top:10vh;'; root.innerHTML='<div style="position:relative;background:#fff;min-width:320px;max-width:720px;width:90%;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.2);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif"><button id="cpclose" aria-label="Close" style="position:absolute;top:8px;right:8px;border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:2px 6px;cursor:pointer">&times;</button><div style="padding:10px 12px;border-bottom:1px solid #e5e7eb"><input id="cpq" type="text" placeholder="Search…" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;outline:none"/></div><div id="cplist" style="max-height:50vh;overflow:auto;padding:6px 0"></div></div>'; document.body.appendChild(root); return root; }
        async function loadRecords(){ try{ var v=''; try{ var m = await fetch(rootBase() + '/api/index.json').then(function(r){return r&&r.ok?r.json():null;}).catch(function(){return null;}); v=(m&&m.version)||''; }catch(_){} var res = await fetch(rootBase() + '/api/search-index.json' + (v?('?v='+encodeURIComponent(v)):'')).catch(function(){return null;}); var j = res && res.ok ? await res.json().catch(function(){return[];}) : []; return Array.isArray(j) ? j : (j && j.records) || []; } catch(_){ return []; } }
        ready(async function(){ var host=document.querySelector('[data-canopy-command]'); if(!host) return; var cfg=parseProps(host)||{}; var maxResults = Number(cfg.maxResults||8)||8; var groupOrder = Array.isArray(cfg.groupOrder)?cfg.groupOrder:['work','page']; var overlay=createUI(); var input=overlay.querySelector('#cpq'); var list=overlay.querySelector('#cplist'); var btnClose=overlay.querySelector('#cpclose');
        try{ if(!host.querySelector('[data-canopy-command-trigger]')){ var btn=document.createElement('button'); btn.type='button'; btn.setAttribute('data-canopy-command-trigger',''); btn.setAttribute('aria-label','Open search'); btn.className='inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50'; var s1=document.createElement('span'); s1.setAttribute('aria-hidden','true'); s1.textContent='⌘K'; var s2=document.createElement('span'); s2.className='sr-only'; s2.textContent=(cfg && cfg.buttonLabel) || 'Search'; btn.appendChild(s1); btn.appendChild(s2); host.appendChild(btn); } }catch(_){ }
        var records = await loadRecords(); function render(items){ list.innerHTML=''; if(!items.length){ list.innerHTML='<div style="padding:10px 12px;color:#6b7280">No results found.</div>'; return; } var groups=new Map(); items.forEach(function(r){ var t=String(r.type||'page'); if(!groups.has(t)) groups.set(t, []); groups.get(t).push(r); }); function gl(t){ if(t==='work') return 'Works'; if(t==='page') return 'Pages'; return t.charAt(0).toUpperCase()+t.slice(1);} var ordered=[].concat(groupOrder.filter(function(t){return groups.has(t);})).concat(Array.from(groups.keys()).filter(function(t){return groupOrder.indexOf(t)===-1;})); ordered.forEach(function(t){ var hdr=document.createElement('div'); hdr.textContent=gl(t); hdr.style.cssText='padding:6px 12px;font-weight:600;color:#374151'; list.appendChild(hdr); groups.get(t).forEach(function(r){ var it=document.createElement('div'); it.tabIndex=0; it.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer'; var thumb=(String(r.type||'')==='work' && r.thumbnail)?r.thumbnail:''; if(thumb){ var img=document.createElement('img'); img.src=thumb; img.alt=''; img.style.cssText='width:40px;height:40px;object-fit:cover;border-radius:4px'; it.appendChild(img);} var span=document.createElement('span'); span.textContent=r.title||r.href; it.appendChild(span); it.onmouseenter=function(){ it.style.background='#f8fafc'; }; it.onmouseleave=function(){ it.style.background='transparent'; }; it.onclick=function(){ try{ window.location.href = withBase(String(r.href||'')); }catch(_){} overlay.style.display='none'; }; list.appendChild(it); }); }); }
        function filterAndShow(q){ try{ var qq=norm(q); if(!qq){ render([]); return; } var out=[]; for(var i=0;i<records.length;i++){ var r=records[i]; var title=String((r&&r.title)||''); if(!title) continue; if(norm(title).indexOf(qq)!==-1) out.push(r); if(out.length>=maxResults) break; } render(out); }catch(_){} }
        btnClose.addEventListener('click', function(){ overlay.style.display='none'; });
        input.addEventListener('input', function(){ filterAndShow(input.value||''); });
        document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ overlay.style.display='none'; }});
        // Hotkey support (e.g., mod+k)
        document.addEventListener('keydown', function(e){
          try {
            var want = String((cfg && cfg.hotkey) || '').toLowerCase();
            if (!want) return;
            var isMod = e.metaKey || e.ctrlKey;
            if ((want === 'mod+k' || want === 'cmd+k' || want === 'ctrl+k') && isMod && (e.key === 'k' || e.key === 'K')) {
              e.preventDefault();
              overlay.style.display='flex';
              input.focus();
              filterAndShow(input.value||'');
            }
          } catch(_) { }
        });
        host.addEventListener('click', function(e){ var trg=e.target && e.target.closest && e.target.closest('[data-canopy-command-trigger]'); if(trg){ e.preventDefault(); overlay.style.display='flex'; input.focus(); filterAndShow(input.value||''); }});
        var btn = document.querySelector('[data-canopy-command-trigger]'); if(btn){ btn.addEventListener('click', function(){ overlay.style.display='flex'; input.focus(); filterAndShow(input.value||''); }); }
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
