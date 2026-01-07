const React = require('react');

const LEVELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
const FALLBACK_DEFAULTS = {
  appearance: 'light',
  accentColor: 'indigo',
  grayColor: 'slate',
};

function themeShowcaseRuntime(levels) {
  const baseDefaults = Object.assign({}, FALLBACK_DEFAULTS);
  const html = typeof document !== 'undefined' ? document.documentElement : null;
  if (!html) return;
  const styleSelector = '[data-theme-showcase-style]';
  let styleEl = document.querySelector(styleSelector);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-theme-showcase-style', 'true');
    document.head.appendChild(styleEl);
  }

  function lookupScale(dataset, appearance, type, name) {
    if (!dataset || !appearance || !type || !name) return null;
    const bucket = dataset.scales && dataset.scales[appearance];
    if (!bucket) return null;
    const entry = bucket[type];
    if (!entry) return null;
    return entry[name] || null;
  }

  function buildOverrideVars(options) {
    const vars = {};
    if (options.accentActive && options.accentScale) {
      for (const level of levels) {
        const value = options.accentScale[level];
        if (value) vars[`--color-accent-${level}`] = `${value} !important`;
      }
      if (options.accentScale['700']) {
        vars['--color-accent-default'] = `${options.accentScale['700']} !important`;
      }
    }
    if (options.grayActive && options.grayScale) {
      for (const level of levels) {
        const value = options.grayScale[level];
        if (value) vars[`--color-gray-${level}`] = `${value} !important`;
      }
      if (options.grayScale['900']) {
        vars['--color-gray-default'] = `${options.grayScale['900']} !important`;
      }
      if (options.grayScale['600']) {
        vars['--color-gray-muted'] = `${options.grayScale['600']} !important`;
      }
    }
    if (
      options.accentActive &&
      options.grayActive &&
      options.accentScale &&
      options.grayScale
    ) {
      if (options.accentScale['700']) {
        vars['--colors-accent'] = `${options.accentScale['700']} !important`;
      }
      if (options.accentScale['800']) {
        vars['--colors-accentAlt'] = `${options.accentScale['800']} !important`;
      }
      if (options.accentScale['400']) {
        vars['--colors-accentMuted'] = `${options.accentScale['400']} !important`;
      }
      if (options.grayScale['900']) {
        const primary = `${options.grayScale['900']} !important`;
        vars['--colors-primary'] = primary;
        vars['--colors-primaryAlt'] = primary;
        vars['--colors-primaryMuted'] = primary;
      }
      if (options.grayScale['50']) {
        const secondary = `${options.grayScale['50']} !important`;
        vars['--colors-secondary'] = secondary;
        vars['--colors-secondaryAlt'] = secondary;
        vars['--colors-secondaryMuted'] = secondary;
      }
    }
    if (options.appearanceActive && options.appearance) {
      vars['color-scheme'] = options.appearance === 'dark' ? 'dark' : 'light';
    }
    return vars;
  }

  function formatCss(vars) {
    const entries = Object.entries(vars).filter(([, value]) => value != null && value !== '');
    if (!entries.length) return '';
    const body = entries.map(([prop, value]) => `  ${prop}: ${value};`).join('\n');
    return `@layer properties {\n  :root {\n${body}\n  }\n  :host {\n${body}\n  }\n}`;
  }

  function titleCase(value) {
    if (!value) return 'None';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function activateHtmlAppearance(mode) {
    if (mode === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }

  const roots = document.querySelectorAll('[data-theme-showcase]');
  if (!roots.length) return;

  roots.forEach((root) => {
    const dataEl = root.querySelector('[data-theme-showcase-values]');
    if (!dataEl) return;
    let dataset = null;
    try {
      dataset = JSON.parse(dataEl.textContent || '{}');
    } catch (error) {
      console.error('[canopy-theme-showcase] Failed to parse preview data', error);
      return;
    }

    const defaults = Object.assign({}, baseDefaults, dataset.defaults || {});
    const state = {
      appearance: defaults.appearance,
      accent: defaults.accentColor,
      gray: defaults.grayColor,
    };

    const statusEl = root.querySelector('[data-theme-showcase-status]');
    const accentLabel = root.querySelector('[data-theme-active-label="accent"]');
    const grayLabel = root.querySelector('[data-theme-active-label="gray"]');
    const appearanceButtons = Array.from(root.querySelectorAll('[data-theme-appearance]'));
    const swatches = Array.from(root.querySelectorAll('[data-theme-swatch]'));
    const clearButtons = Array.from(root.querySelectorAll('[data-theme-clear]'));
    const resetBtn = root.querySelector('[data-theme-reset]');

    function updateAppearanceButtons() {
      appearanceButtons.forEach((button) => {
        const value = button.getAttribute('data-theme-appearance');
        if (!value) return;
        const isActive = value === state.appearance;
        if (isActive) button.classList.add('is-active');
        else button.classList.remove('is-active');
      });
    }

    function updateSwatchIndicators() {
      swatches.forEach((swatch) => {
        const type = swatch.getAttribute('data-theme-swatch-type');
        const value = swatch.getAttribute('data-theme-swatch-value');
        if (!type || !value) return;
        const isActive = state[type] === value;
        swatch.setAttribute('data-swatch-active', isActive ? 'true' : 'false');
        swatch.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function updateLabels() {
      if (accentLabel) accentLabel.textContent = titleCase(state.accent);
      if (grayLabel) grayLabel.textContent = titleCase(state.gray);
    }

    function updateStatus() {
      if (!statusEl) return;
      const parts = [];
      if (state.appearance) parts.push(`appearance: ${state.appearance}`);
      if (state.accent) parts.push(`accent: ${state.accent}`);
      if (state.gray) parts.push(`gray: ${state.gray}`);
      statusEl.textContent = parts.length
        ? `Overrides → ${parts.join(' • ')}`
        : 'No overrides active';
    }

    function apply() {
      const activeAppearance = state.appearance || defaults.appearance;
      const accentScale = state.accent
        ? lookupScale(dataset, activeAppearance, 'accent', state.accent)
        : null;
      const grayScale = state.gray
        ? lookupScale(dataset, activeAppearance, 'gray', state.gray)
        : null;
      const css = formatCss(
        buildOverrideVars({
          accentActive: Boolean(accentScale),
          grayActive: Boolean(grayScale),
          appearanceActive: Boolean(state.appearance),
          appearance: activeAppearance,
          accentScale,
          grayScale,
        })
      );
      styleEl.textContent = css;
      activateHtmlAppearance(state.appearance || defaults.appearance);
      updateStatus();
      updateLabels();
      updateSwatchIndicators();
      updateAppearanceButtons();
    }

    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const type = swatch.getAttribute('data-theme-swatch-type');
        const value = swatch.getAttribute('data-theme-swatch-value');
        if (!type || !value) return;
        if (state[type] === value) {
          state[type] = null;
        } else {
          state[type] = value;
        }
        apply();
      });
    });

    clearButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const type = button.getAttribute('data-theme-clear');
        if (!type) return;
        state[type] = null;
        apply();
      });
    });

    appearanceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.getAttribute('data-theme-appearance');
        if (!value) return;
        state.appearance = value;
        apply();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.appearance = defaults.appearance;
        state.accent = defaults.accentColor;
        state.gray = defaults.grayColor;
        apply();
      });
    }

    apply();
  });
}

const SCRIPT = (() => {
  const runtimeSource = themeShowcaseRuntime
    .toString()
    .replace('const baseDefaults = Object.assign({}, FALLBACK_DEFAULTS);', `const baseDefaults = ${JSON.stringify(FALLBACK_DEFAULTS)};`);
  const raw = `(${runtimeSource})(${JSON.stringify(LEVELS)});`;
  return raw.replace(/<\/script/gi, '<\\/script');
})();

function ThemeShowcaseScript() {
  return React.createElement('script', {
    dangerouslySetInnerHTML: {__html: SCRIPT},
  });
}

module.exports = ThemeShowcaseScript;
module.exports.default = ThemeShowcaseScript;
