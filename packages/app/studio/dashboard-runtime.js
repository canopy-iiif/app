(() => {
  const root = document.getElementById('canopy-studio-root');
  if (!root) return;
  const iframe = root.querySelector('[data-studio-iframe]');
  const previewSection = root.querySelector('[data-studio-preview]');
  const statusEl = root.querySelector('[data-studio-status]');
  const fields = {
    slug: root.querySelector('[data-studio-field="slug"]'),
    source: root.querySelector('[data-studio-field="source"]'),
  };
  const editButton = root.querySelector('[data-studio-edit]');
  const previewDraftButton = root.querySelector('[data-studio-preview-draft]');
  const editorWrapper = root.querySelector('[data-studio-editor]');
  const editorInput = root.querySelector('[data-studio-editor-input]');
  const basePathAttr = root.getAttribute('data-base-path') || '';
  const normalizeBasePathValue = (value) => {
    if (!value) return '';
    let raw = String(value).trim();
    if (!raw || raw === '/') return '';
    while (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1);
    return raw === '/' ? '' : raw;
  };
  const normalizedBasePath = normalizeBasePathValue(basePathAttr);
  const stripLeadingSlashes = (value) => {
    let str = String(value || '');
    while (str.startsWith('/')) str = str.slice(1);
    return str;
  };
  const defaultPreviewSrc = root.getAttribute('data-preview-src') || '/index.html';
  const endpoint = root.getAttribute('data-pages-endpoint') || './api/studio/pages.json';
  const sharedHeadMarkup = (() => {
    try {
      const el = document.getElementById('canopy-studio-head');
      if (!el) return '';
      const json = el.textContent || '""';
      const parsed = JSON.parse(json) || '';
      if (!parsed) return '';
      return String(parsed).replace(/<\\\/script/gi, '</script');
    } catch (_) {
      return '';
    }
  })();
  const previewRuntimeHref = root.getAttribute('data-preview-runtime') || '';
  const sanitizeDraftState = (value) =>
    (value || '').replace(/<\/script/gi, '<\\/script');
  const IMPORT_FROM_PATTERN = /^import\s+([\s\S]+?)\s+from\s+['"]([^'"\n;]+)['"];?$/gm;
  const IMPORT_SIDE_PATTERN = /^import\s+['"]([^'"\n;]+)['"];?$/gm;
  const normalizeClientPath = (value) => (value || '').replace(/\\/g, '/');
  const splitPathSegments = (value) =>
    normalizeClientPath(value)
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  const resolveImportKeyForClient = (specifier, sourcePath) => {
    if (!specifier) return '';
    if (!specifier.startsWith('.')) return specifier;
    const dirParts = splitPathSegments(sourcePath).slice(0, -1);
    const specParts = splitPathSegments(specifier);
    const stack = dirParts.slice();
    for (const part of specParts) {
      if (part === '..') {
        stack.pop();
      } else if (part === '.' || part === '') {
        continue;
      } else {
        stack.push(part);
      }
    }
    const rel = stack.join('/');
    return rel ? `content/${rel}` : specifier;
  };
  const parseNamedMembers = (block) => {
    const inner = block.replace(/[{}]/g, '').trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((segment) => {
        const pieces = segment.split(/\s+as\s+/i);
        if (pieces.length === 2) {
          return {type: 'named', imported: pieces[0].trim(), local: pieces[1].trim()};
        }
        return {type: 'named', imported: pieces[0].trim(), local: pieces[0].trim()};
      })
      .filter((entry) => entry.imported && entry.local);
  };
  const parseImportClauseMembers = (clause) => {
    if (!clause) return [];
    let working = clause.trim();
    if (!working) return [];
    const members = [];
    const namespaceMatch = working.match(/\*\s+as\s+([A-Za-z0-9_$]+)/);
    if (namespaceMatch) {
      members.push({type: 'namespace', local: namespaceMatch[1]});
      working = working.replace(namespaceMatch[0], '').trim();
    }
    const namedMatch = working.match(/\{[^}]+\}/);
    if (namedMatch) {
      members.push(...parseNamedMembers(namedMatch[0]));
      working = working.replace(namedMatch[0], '').trim();
    }
    const defaultMatch = working.replace(/,/g, ' ').trim();
    if (defaultMatch) {
      const local = defaultMatch.split(/\s+/)[0].trim();
      if (local) members.push({type: 'default', local});
    }
    return members;
  };
  const stripImportLines = (source, imports) => {
    if (!source || !Array.isArray(imports) || !imports.length) return source;
    let next = String(source);
    imports.forEach((entry) => {
      if (entry && entry.raw) {
        next = next.replace(entry.raw, '');
      }
    });
    return next;
  };
  const extractImportsFromSource = (source, sourcePath) => {
    const imports = [];
    if (!source) return imports;
    const text = String(source);
    let match;
    while ((match = IMPORT_FROM_PATTERN.exec(text))) {
      const clause = match[1];
      const specifier = match[2];
      if (!specifier) continue;
      imports.push({
        specifier,
        resolvedKey: resolveImportKeyForClient(specifier, sourcePath),
        members: parseImportClauseMembers(clause),
        raw: match[0],
      });
    }
    const sideEffectPattern = new RegExp(IMPORT_SIDE_PATTERN.source, 'gm');
    while ((match = sideEffectPattern.exec(text))) {
      const full = match[0] || '';
      if (/from\s+/i.test(full)) continue;
      const specifier = match[1];
      if (!specifier) continue;
      imports.push({
        specifier,
        resolvedKey: resolveImportKeyForClient(specifier, sourcePath),
        members: [],
        raw: full,
      });
    }
    return imports;
  };

  const pagesByHref = new Map();
  let pages = [];
  let currentPage = null;
  let editMode = false;
  let previewState = 'published';

  const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };

  const normalizeHref = (value) => {
    if (!value && value !== 0) return '';
    let raw = '';
    try { raw = String(value); } catch (_) { raw = ''; }
    raw = raw.trim();
    if (!raw) return '';
    if (/^[a-z]+:/i.test(raw)) return raw; // already absolute
    const clean = raw.startsWith('/') ? stripLeadingSlashes(raw) : stripLeadingSlashes(raw);
    const prefixed = '/' + clean;
    if (!normalizedBasePath) return prefixed;
    if (prefixed === normalizedBasePath) return '/';
    if (prefixed.startsWith(normalizedBasePath + '/')) {
      const trimmed = prefixed.slice(normalizedBasePath.length);
      return trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    }
    return prefixed;
  };

  const buildPreviewSrc = (href) => {
    const slug = normalizeHref(href);
    if (!slug) return defaultPreviewSrc;
    if (/^[a-z]+:/i.test(slug)) return slug;
    if (!normalizedBasePath) return slug;
    if (slug === '/') return normalizedBasePath || '/';
    return normalizedBasePath + slug;
  };

  const updateFieldsFromPage = (page) => {
    const slug = normalizeHref(page && page.href);
    if (fields.slug) fields.slug.textContent = slug || '—';
    const source = page && page.sourcePath ? '/content/' + stripLeadingSlashes(page.sourcePath) : '—';
    if (fields.source) fields.source.textContent = source;
  };

  const updateEditorFromPage = (page) => {
    if (!editorInput) return;
    editorInput.value = page && typeof page.sourceContent === 'string' ? page.sourceContent : '';
  };

  const readIframeContentPath = () => {
    if (!iframe) return '';
    try {
      const doc = iframe.contentDocument;
      if (!doc || !doc.documentElement) return '';
      const attr = doc.documentElement.getAttribute('data-canopy-path');
      return attr || '';
    } catch (_) {
      return '';
    }
  };

  const syncFieldsForLocation = (path, datasetPath) => {
    const slug = normalizeHref(path);
    const matching = pagesByHref.get(slug);
    if (matching) {
      updateFieldsFromPage(matching);
      currentPage = matching;
      if (editMode) updateEditorFromPage(matching);
      disableEditButton(!matching || !matching.sourceContent);
      if (!editMode && previewState === 'draft') {
        // stay on draft preview state
      }
      return;
    }
    currentPage = null;
    disableEditButton(true);
    if (fields.slug) fields.slug.textContent = slug || path || '—';
    if (fields.source) fields.source.textContent = datasetPath || '—';
  };

  const updateIframe = (page) => {
    if (!iframe) return;
    iframe.removeAttribute('srcdoc');
    iframe.src = buildPreviewSrc(page && page.href);
    previewState = 'published';
  };

  const setPreviewMode = (mode) => {
    if (!previewSection) return;
    previewSection.dataset.mode = mode === 'edit' ? 'edit' : 'preview';
  };

  const disableEditButton = (disabled) => {
    if (!editButton) return;
    editButton.disabled = disabled;
    if (previewDraftButton) previewDraftButton.disabled = disabled;
  };

  const updateEditButtonLabel = () => {
    if (!editButton) return;
    editButton.textContent = editMode ? 'View preview' : 'Edit page';
  };

  const markdownToHtml = (markdown) => {
    if (!markdown) return '<p></p>';
    const escapeHtml = (str) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const inlineCodePattern = /`([^`]+)`/g;
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const italicPattern = /\*([^*]+)\*/g;
    const linkPattern = /\[(.*?)\]\((.*?)\)/g;
    const convertInline = (text) => {
      let safe = escapeHtml(text);
      safe = safe.replace(inlineCodePattern, '<code>$1</code>');
      safe = safe.replace(boldPattern, '<strong>$1</strong>');
      safe = safe.replace(italicPattern, '<em>$1</em>');
      safe = safe.replace(linkPattern, '<a href="$2">$1</a>');
      return safe;
    };
    const normalized = markdown.replace(/\r\n/g, '\n');
    const blocks = normalized.split(/\n{2,}/).map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^#{1,6}\s/.test(trimmed)) {
        const levelMatch = trimmed.match(/^#{1,6}/);
        const level = levelMatch ? levelMatch[0].length : 1;
        const content = trimmed.replace(/^#{1,6}\s*/, '');
        return '<h' + level + '>' + convertInline(content) + '</h' + level + '>';
      }
      if (/^\s*-\s+/.test(trimmed)) {
        const items = trimmed
          .split(/\n/)
          .map((line) => line.replace(/^\s*-\s+/, ''))
          .filter(Boolean)
          .map((item) => '<li>' + convertInline(item) + '</li>')
          .join('');
        return '<ul>' + items + '</ul>';
      }
      return '<p>' + convertInline(trimmed) + '</p>';
    });
    return blocks.join('');
  };

  const buildDraftHtml = (state) => {
    const hasRuntime = !!previewRuntimeHref;
    const payload =
      state && typeof state === 'object'
        ? state
        : {source: typeof state === 'string' ? state : '', imports: []};
    if (!hasRuntime) {
      const markdown = stripImportLines(payload.source || '', payload.imports);
      const body = markdownToHtml(markdown || '');
      const headMarkup = sharedHeadMarkup || '';
      return (
        '<!doctype html><html lang="en" data-accent="indigo">' +
        headMarkup +
        '<body class="canopy-type-page">' +
        body +
        '</body></html>'
      );
    }
    const draftState = {
      source: payload.source || '',
      imports: Array.isArray(payload.imports) ? payload.imports : [],
      headMarkup: sharedHeadMarkup || '',
    };
    const serialized = sanitizeDraftState(JSON.stringify(draftState));
    return (
      '<!doctype html><html lang="en" data-accent="indigo">' +
      (sharedHeadMarkup || '') +
      '<body class="canopy-type-page"><div id="canopy-studio-draft-root"></div>' +
      `<script>window.__CANOPY_STUDIO_DRAFT__=${serialized};</script>` +
      `<script type="module" src="${previewRuntimeHref}"></script>` +
      '</body></html>'
    );
  };

  const renderDraftPreview = () => {
    if (!currentPage || !editorInput) return;
    const draftSource = editorInput.value || '';
    const imports = extractImportsFromSource(
      draftSource,
      currentPage && currentPage.sourcePath ? currentPage.sourcePath : '',
    );
    const html = buildDraftHtml({source: draftSource, imports});
    if (iframe) iframe.srcdoc = html;
    previewState = 'draft';
    editMode = false;
    setPreviewMode('preview');
    updateEditButtonLabel();
    setStatus('Showing client-side draft preview');
  };

  const handleIframeLoad = () => {
    if (!iframe) return;
    try {
      const win = iframe.contentWindow;
      if (!win || !win.location) return;
      const path = win.location.pathname + (win.location.search || '');
      const datasetPath = readIframeContentPath();
      syncFieldsForLocation(path || iframe.getAttribute('src'), datasetPath);
    } catch (_) {
      // Ignore cross-origin errors (shouldn't occur in workspace)
    }
  };
  if (iframe) iframe.addEventListener('load', handleIframeLoad);

  if (editButton) {
    editButton.addEventListener('click', () => {
      if (!currentPage || !currentPage.sourceContent) {
        setStatus('Editing unavailable for this page.');
        return;
      }
      if (!editMode) {
        editMode = true;
        setPreviewMode('edit');
        updateEditorFromPage(currentPage);
        updateEditButtonLabel();
        return;
      }
      editMode = false;
      setPreviewMode('preview');
      updateEditButtonLabel();
      updateIframe(currentPage);
    });
  }

  if (previewDraftButton) {
    previewDraftButton.addEventListener('click', () => {
      if (!currentPage || !currentPage.sourceContent) {
        setStatus('Editing unavailable for this page.');
        return;
      }
      renderDraftPreview();
    });
  }

  const loadPages = async () => {
    setStatus('Loading pages…');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch studio data');
      const payload = await response.json();
      pages = Array.isArray(payload && payload.pages)
        ? payload.pages
        : Array.isArray(payload)
        ? payload
        : [];
      pagesByHref.clear();
      const registerSlug = (slug, page) => {
        if (!slug) return;
        pagesByHref.set(slug, page);
        if (slug.endsWith('/index.html')) {
          const withoutIndex = slug.slice(0, -'index.html'.length);
          const withSlash = withoutIndex.endsWith('/') ? withoutIndex : withoutIndex + '/';
          pagesByHref.set(withSlash, page);
          const withoutSlash = withSlash === '/' ? '/' : (withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash);
          if (withoutSlash) pagesByHref.set(withoutSlash, page);
        }
        if (slug.endsWith('.html')) {
          const withoutHtml = slug.slice(0, -'.html'.length);
          if (withoutHtml) pagesByHref.set(withoutHtml, page);
        }
      };
      pages.forEach((page) => {
        const key = normalizeHref(page && page.href);
        if (key) {
          registerSlug(key, page);
          if (normalizedBasePath) {
            registerSlug(normalizedBasePath + key, page);
          }
        }
      });
      if (!pages.length) {
        if (fields.slug) fields.slug.textContent = 'No pages available';
        if (fields.source) fields.source.textContent = '—';
        setStatus('Add MDX content and rebuild to populate the studio.');
        disableEditButton(true);
        return;
      }
      const page = pages[0];
      currentPage = page;
      editMode = false;
      setPreviewMode('preview');
      updateEditButtonLabel();
      disableEditButton(!page || !page.sourceContent);
      updateFieldsFromPage(page);
      updateEditorFromPage(page);
      updateIframe(page);
      const label = page && page.title ? page.title : page && page.href ? page.href : 'page';
      setStatus('Previewing ' + label);
    } catch (error) {
      console.error('[canopy-studio] Unable to load data', error);
      setStatus('Unable to load studio data. Check console output.');
    }
  };

  loadPages();
})();
