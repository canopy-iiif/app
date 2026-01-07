const React = require('react');

const STORAGE_KEY = 'canopy_content_theme_preview';

function ThemeStorageHydrator() {
  const source = `(() => {
    const STORAGE_KEY = '${STORAGE_KEY}';
    const STYLE_ATTR = 'data-theme-storage-style';
    if (typeof document === 'undefined') return;
    const html = document.documentElement;

    function parseStored() {
      try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
      } catch (_) {
        return null;
      }
    }

    function applyStoredTheme() {
      const payload = parseStored();
      let styleEl = document.querySelector('style[' + STYLE_ATTR + ']');
      if (!payload || !payload.css) {
        if (styleEl) styleEl.remove();
        html.classList.remove('dark');
        return;
      }
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.setAttribute(STYLE_ATTR, 'true');
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = payload.css;
      const appearance = payload.appliedAppearance || payload.appearance || 'light';
      if (appearance === 'dark') html.classList.add('dark');
      else html.classList.remove('dark');
    }

    applyStoredTheme();
    window.addEventListener('storage', (event) => {
      if (!event || event.key !== STORAGE_KEY) return;
      applyStoredTheme();
    });
  })();`;

  return React.createElement('script', {
    dangerouslySetInnerHTML: {__html: source},
  });
}

module.exports = ThemeStorageHydrator;
module.exports.default = ThemeStorageHydrator;
