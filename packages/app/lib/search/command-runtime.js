function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function parseProps(el) {
  try {
    const script = el.querySelector('script[type="application/json"]');
    if (script) return JSON.parse(script.textContent || '{}');
  } catch (_) {}
  return {};
}

function toLower(val) {
  try {
    return String(val || '').toLowerCase();
  } catch (_) {
    return '';
  }
}

function getBasePath() {
  try {
    const raw = (window && window.CANOPY_BASE_PATH) ? String(window.CANOPY_BASE_PATH) : '';
    if (!raw) return '';
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  } catch (_) {
    return '';
  }
}

function withBase(href) {
  try {
    let raw = href == null ? '' : String(href);
    raw = raw.trim();
    if (!raw) return raw;
    const basePath = getBasePath();
    if (!basePath) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//') || raw.startsWith('#') || raw.startsWith('?')) {
        return raw;
      }
      let cleaned = raw.replace(/^\/+/, '');
      while (cleaned.startsWith('./')) cleaned = cleaned.slice(2);
      while (cleaned.startsWith('../')) cleaned = cleaned.slice(3);
      if (!cleaned) return '/';
      return '/' + cleaned;
    }
    if (/^https?:/i.test(raw)) return raw;
    const cleaned = raw.replace(/^\/+/, '');
    return `${basePath}/${cleaned}`;
  } catch (_) {
    return href;
  }
}

function rootBase() {
  return getBasePath();
}

function isOnSearchPage() {
  try {
    const base = rootBase();
    let path = String(location.pathname || '');
    if (base && path.startsWith(base)) path = path.slice(base.length);
    if (path.endsWith('/')) path = path.slice(0, -1);
    return path === '/search';
  } catch (_) {
    return false;
  }
}

let recordsPromise = null;
async function loadRecords() {
  if (!recordsPromise) {
    recordsPromise = (async () => {
      try {
        const base = rootBase();
        let version = '';
        try {
          const meta = await fetch(`${base}/api/index.json`).then((r) => (r && r.ok ? r.json() : null)).catch(() => null);
          if (meta && typeof meta.version === 'string') version = meta.version;
        } catch (_) {}
        const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
        const response = await fetch(`${base}/api/search-index.json${suffix}`).catch(() => null);
        if (!response || !response.ok) return [];
        const json = await response.json().catch(() => []);
        if (Array.isArray(json)) return json;
        if (json && Array.isArray(json.records)) return json.records;
        return [];
      } catch (_) {
        return [];
      }
    })();
  }
  return recordsPromise;
}

function groupLabel(type) {
  if (type === 'work') return 'Works';
  if (type === 'page') return 'Pages';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getItems(list) {
  try {
    return Array.prototype.slice.call(list.querySelectorAll('[data-canopy-item]'));
  } catch (_) {
    return [];
  }
}

function renderList(list, records, groupOrder) {
  list.innerHTML = '';
  if (!records.length) return;
  const groups = new Map();
  records.forEach((record) => {
    const type = String(record && record.type || 'page');
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(record);
  });
  const desiredOrder = Array.isArray(groupOrder) ? groupOrder : [];
  const orderedKeys = [...desiredOrder.filter((key) => groups.has(key)), ...Array.from(groups.keys()).filter((key) => !desiredOrder.includes(key))];
  orderedKeys.forEach((key) => {
    const header = document.createElement('div');
    header.textContent = groupLabel(key);
    header.style.cssText = 'padding:6px 12px;font-weight:600;color:#374151';
    list.appendChild(header);
    const entries = groups.get(key) || [];
    entries.forEach((record, index) => {
      const item = document.createElement('div');
      item.setAttribute('data-canopy-item', '');
      item.tabIndex = 0;
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;outline:none;';
      const showThumb = String(record && record.type || '') === 'work' && record && record.thumbnail;
      if (showThumb) {
        const img = document.createElement('img');
        img.src = record.thumbnail;
        img.alt = '';
        img.style.cssText = 'width:40px;height:40px;object-fit:cover;border-radius:4px';
        item.appendChild(img);
      }
      const span = document.createElement('span');
      span.textContent = record.title || record.href || '';
      item.appendChild(span);
      item.onmouseenter = () => { item.style.background = '#f8fafc'; };
      item.onmouseleave = () => { item.style.background = 'transparent'; };
      item.onfocus = () => {
        item.style.background = '#eef2ff';
        try { item.scrollIntoView({ block: 'nearest' }); } catch (_) {}
      };
      item.onblur = () => { item.style.background = 'transparent'; };
      item.onclick = () => {
        try { window.location.href = withBase(String(record.href || '')); } catch (_) {}
      };
      list.appendChild(item);
    });
  });
}

function focusFirst(list) {
  const items = getItems(list);
  if (!items.length) return;
  items[0].focus();
}

function focusLast(list, resetTarget) {
  const items = getItems(list);
  if (!items.length) {
    if (resetTarget && resetTarget.focus) resetTarget.focus();
    return;
  }
  items[items.length - 1].focus();
}

function bindKeyboardNavigation({ input, list, panel }) {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      panel.style.display = 'block';
      focusFirst(list);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      panel.style.display = 'block';
      focusLast(list, input);
    }
  });

  list.addEventListener('keydown', (event) => {
    const current = event.target && event.target.closest && event.target.closest('[data-canopy-item]');
    if (!current) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const items = getItems(list);
      const idx = items.indexOf(current);
      const next = items[Math.min(items.length - 1, idx + 1)] || current;
      next.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const items = getItems(list);
      const idx = items.indexOf(current);
      if (idx <= 0) {
        input && input.focus && input.focus();
      } else {
        const prev = items[idx - 1];
        ;(prev || current).focus();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      try { current.click(); } catch (_) {}
    } else if (event.key === 'Escape') {
      panel.style.display = 'none';
      try { input && input.focus && input.focus(); } catch (_) {}
    }
  });
}

async function attachCommand(host) {
  const config = parseProps(host) || {};
  const maxResults = Number(config.maxResults || 8) || 8;
  const groupOrder = Array.isArray(config.groupOrder) ? config.groupOrder : ['work', 'page'];
  const hotkey = typeof config.hotkey === 'string' ? config.hotkey : '';
  const onSearchPage = isOnSearchPage();

  const panel = (() => {
    try { return host.querySelector('[data-canopy-command-panel]'); } catch (_) { return null; }
  })();
  if (!panel) return;

  if (!onSearchPage) {
    try {
      const wrapper = host.querySelector('.relative');
      if (wrapper) wrapper.setAttribute('data-canopy-panel-auto', '1');
    } catch (_) {}
  }

  if (onSearchPage) panel.style.display = 'none';

  const list = (() => {
    try { return panel.querySelector('#cplist'); } catch (_) { return null; }
  })();
  if (!list) return;

  const input = (() => {
    try { return host.querySelector('[data-canopy-command-input]'); } catch (_) { return null; }
  })();
  if (!input) return;

  try {
    const params = new URLSearchParams(location.search || '');
    const qp = params.get('q');
    if (qp) input.value = qp;
  } catch (_) {}

  const records = await loadRecords();

  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      panel.style.display = onSearchPage ? 'none' : 'block';
      return;
    }
    renderList(list, items, groupOrder);
    panel.style.display = 'block';
  }

  function filterAndShow(query) {
    try {
      const q = toLower(query);
      if (!q) {
        list.innerHTML = '';
        panel.style.display = onSearchPage ? 'none' : 'block';
        return;
      }
      const out = [];
      for (let i = 0; i < records.length; i += 1) {
        const record = records[i];
        const title = String(record && record.title || '');
        if (!title) continue;
        if (toLower(title).includes(q)) out.push(record);
        if (out.length >= maxResults) break;
      }
      render(out);
    } catch (_) {}
  }

  input.addEventListener('input', () => {
    if (onSearchPage) {
      try {
        const ev = new CustomEvent('canopy:search:setQuery', { detail: { query: input.value || '' } });
        window.dispatchEvent(ev);
      } catch (_) {}
      return;
    }
    filterAndShow(input.value || '');
  });

  bindKeyboardNavigation({ input, list, panel });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      panel.style.display = 'none';
    }
  });

  document.addEventListener('mousedown', (event) => {
    try {
      if (!panel.contains(event.target) && !host.contains(event.target)) {
        panel.style.display = 'none';
      }
    } catch (_) {}
  });

  if (hotkey) {
    document.addEventListener('keydown', (event) => {
      try {
        const want = hotkey.toLowerCase();
        if (!want) return;
        const isMod = event.metaKey || event.ctrlKey;
        const isCmd = (want === 'mod+k' || want === 'cmd+k' || want === 'ctrl+k') && (event.key === 'k' || event.key === 'K');
        if (isCmd && isMod) {
          event.preventDefault();
          if (onSearchPage) {
            try { window.dispatchEvent(new CustomEvent('canopy:search:setQuery', { detail: { hotkey: true } })); } catch (_) {}
            return;
          }
          panel.style.display = 'block';
          if (input && input.focus) input.focus();
          filterAndShow(input && input.value || '');
        }
      } catch (_) {}
    });
  }

  function openPanel() {
    if (onSearchPage) {
      try { window.dispatchEvent(new CustomEvent('canopy:search:setQuery', { detail: {} })); } catch (_) {}
      return;
    }
    panel.style.display = 'block';
    if (input && input.focus) input.focus();
    filterAndShow(input && input.value || '');
  }

  host.addEventListener('click', (event) => {
    const trigger = event.target && event.target.closest && event.target.closest('[data-canopy-command-trigger]');
    if (!trigger) return;
    const mode = (trigger.dataset && trigger.dataset.canopyCommandTrigger) || '';
    if (mode === 'submit' || mode === 'form') return;
    event.preventDefault();
    openPanel();
  });

  try {
    input.addEventListener('focus', () => { openPanel(); });
  } catch (_) {}
}

ready(() => {
  const hosts = Array.from(document.querySelectorAll('[data-canopy-command]'));
  if (!hosts.length) return;
  hosts.forEach((host) => {
    attachCommand(host).catch((err) => {
      try {
        console.warn('[canopy][command] failed to initialise', err && (err.message || err));
      } catch (_) {}
    });
  });
});
