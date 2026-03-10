import React, { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import {useLocale} from "../locale/index.js";

function normalize(s) {
  try { return String(s || '').toLowerCase(); } catch { return ''; }
}

export default function SearchFormModalApp(props) {
  const {
    records = [],
    loading = false,
    open: controlledOpen,
    onOpenChange,
    onSelect = () => {},
    config = {},
  } = props || {};
  const {
    placeholder: placeholderProp,
    hotkey = 'mod+k',
    maxResults = 8,
    groupOrder = ['work', 'page'],
    button = true,
    buttonLabel: buttonLabelProp,
  } = config || {};
  const {getString, formatString} = useLocale();
  const searchLabel = getString('common.nouns.search', 'Search');
  const placeholder =
    placeholderProp != null
      ? placeholderProp
      : getString('common.phrases.placeholder_search', 'Search…');
  const buttonLabel =
    buttonLabelProp != null
      ? buttonLabelProp
      : getString('common.nouns.search', 'Search');
  const openSearchLabel = formatString(
    'common.phrases.open_content',
    'Open {content}',
    {content: searchLabel},
  );
  const closeLabel = formatString(
    'common.phrases.close_content',
    'Close {content}',
    {content: searchLabel},
  );
  const loadingLabel = getString('common.statuses.loading', 'Loading…');
  const emptyLabel = getString(
    'common.statuses.no_matches',
    'No results found.',
  );
  const typeLabels = useMemo(
    () => ({
      work: getString('common.types.work', 'Works'),
      page: getString('common.types.page', 'Pages'),
      docs: getString('common.types.docs', 'Docs'),
    }),
    [getString],
  );
  const groupLabel = (t) => {
    const type = String(t || '').toLowerCase();
    if (typeLabels[type]) return typeLabels[type];
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
  };

  const [open, setOpen] = useState(!!controlledOpen);
  useEffect(() => { if (typeof controlledOpen === 'boolean') setOpen(controlledOpen); }, [controlledOpen]);
  const setOpenBoth = (v) => { setOpen(!!v); if (onOpenChange) onOpenChange(!!v); };

  const [q, setQ] = useState('');
  // Hotkey open
  useEffect(() => {
    function handler(e) {
      try {
        const hk = String(hotkey || 'mod+k').toLowerCase();
        const isMod = hk.includes('mod+');
        const key = hk.split('+').pop();
        if ((isMod ? (e.metaKey || e.ctrlKey) : true) && e.key.toLowerCase() === String(key || 'k')) {
          e.preventDefault();
          setOpenBoth(true);
        }
      } catch {}
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hotkey]);
  // Esc close
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpenBoth(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    if (!q) return [];
    const qq = normalize(q);
    const out = [];
    for (const r of (records || [])) {
      const title = String(r && r.title || '');
      if (!title) continue;
      if (normalize(title).includes(qq)) out.push(r);
      if (out.length >= Math.max(1, Number(maxResults) || 8)) break;
    }
    return out;
  }, [q, records, maxResults]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of results) { const t = String(r && r.type || 'page'); if (!map.has(t)) map.set(t, []); map.get(t).push(r); }
    return map;
  }, [results]);

  const onOverlayMouseDown = (e) => { if (e.target === e.currentTarget) setOpenBoth(false); };
  const onItemSelect = (href) => { try { onSelect(String(href || '')); setOpenBoth(false); } catch {} };

  return (
    <div className="canopy-search-form-modal">
      {button && (
        <button
          type="button"
          className="canopy-search-form-modal__trigger"
          onClick={() => setOpenBoth(true)}
          aria-label={openSearchLabel}
          data-canopy-search-form-trigger
        >
          <span aria-hidden>⌘K</span>
          <span className="sr-only">{buttonLabel}</span>
        </button>
      )}

      <div
        className="canopy-search-form-modal__overlay"
        data-open={open ? '1' : '0'}
        onMouseDown={onOverlayMouseDown}
        style={{ display: open ? 'flex' : 'none' }}
      >
        <div className="canopy-search-form-modal__panel">
          <button className="canopy-search-form-modal__close" aria-label={closeLabel || 'Close'} onClick={() => setOpenBoth(false)}>&times;</button>
          <div className="canopy-search-form-modal__inputWrap">
            <Command>
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder={placeholder} className="canopy-search-form-modal__input" />
              <Command.List className="canopy-search-form-modal__list">
                {loading && <Command.Loading>{loadingLabel}</Command.Loading>}
                <Command.Empty>{emptyLabel}</Command.Empty>
                {(Array.isArray(groupOrder) ? groupOrder : []).map((t) => (
                  grouped.has(t) ? (
                    <Command.Group key={t} heading={groupLabel(t)}>
                      {grouped.get(t).map((r, i) => (
                        <Command.Item key={t + '-' + i} onSelect={() => onItemSelect(r.href)}>
                          <div className="canopy-search-form-modal__item">
                            {String(r.type || '') === 'work' && r.thumbnail ? (
                              <img className="canopy-search-form-modal__thumb" src={r.thumbnail} alt="" />
                            ) : null}
                            <span className="canopy-search-form-modal__title">{r.title}</span>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ) : null
                ))}
                {Array.from(grouped.keys())
                  .filter((t) => !(groupOrder || []).includes(t))
                  .map((t) => (
                    <Command.Group key={t} heading={groupLabel(t)}>
                      {grouped.get(t).map((r, i) => (
                        <Command.Item key={t + '-x-' + i} onSelect={() => onItemSelect(r.href)}>
                          <div className="canopy-search-form-modal__item">
                            {String(r.type || '') === 'work' && r.thumbnail ? (
                              <img className="canopy-search-form-modal__thumb" src={r.thumbnail} alt="" />
                            ) : null}
                            <span className="canopy-search-form-modal__title">{r.title}</span>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))}
              </Command.List>
            </Command>
          </div>
        </div>
      </div>
    </div>
  );
}
