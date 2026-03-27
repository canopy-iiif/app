const DEFAULT_ACCENT_HEX = '#2563eb';

function normalizeHex(value) {
  if (!value) return '';
  let input = String(value).trim();
  if (!input) return '';
  if (input.startsWith('var(')) return input;
  if (/^#[0-9a-f]{3}$/i.test(input)) {
    return (
      '#' +
      input
        .replace(/^#/, '')
        .split('')
        .map((ch) => ch + ch)
        .join('')
        .toLowerCase()
    );
  }
  if (/^#[0-9a-f]{6}$/i.test(input)) return input.toLowerCase();
  return '';
}

function hexToRgb(hex) {
  if (!hex) return null;
  const normalized = normalizeHex(hex);
  if (!normalized || normalized.startsWith('var(')) return null;
  const int = parseInt(normalized.slice(1), 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHsl({r, g, b}) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / delta + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      case bn:
        h = (rn - gn) / delta + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }
  return {h: h * 360, s: s * 100, l: l * 100};
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) {
    r = c;
    g = x;
  } else if (hh >= 1 && hh < 2) {
    r = x;
    g = c;
  } else if (hh >= 2 && hh < 3) {
    g = c;
    b = x;
  } else if (hh >= 3 && hh < 4) {
    g = x;
    b = c;
  } else if (hh >= 4 && hh < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = light - c / 2;
  const rn = Math.round((r + m) * 255);
  const gn = Math.round((g + m) * 255);
  const bn = Math.round((b + m) * 255);
  const toHex = (value) => value.toString(16).padStart(2, '0');
  return `#${toHex(rn)}${toHex(gn)}${toHex(bn)}`;
}

function rotateHue(baseHue, degrees) {
  return (baseHue + degrees + 360) % 360;
}

function resolveAccentHex() {
  let value = '';
  try {
    if (typeof window !== 'undefined') {
      const styles = window.getComputedStyle(document.documentElement);
      value = styles.getPropertyValue('--color-accent-default');
    }
  } catch (_) {}
  const normalized = normalizeHex(value);
  return normalized && !normalized.startsWith('var(')
    ? normalized
    : DEFAULT_ACCENT_HEX;
}

function generateLegendColors(count) {
  if (!count || count <= 0) return [];
  const colors = [];
  const baseHex = resolveAccentHex();
  const accentVar = `var(--color-accent-default, ${baseHex})`;
  colors.push(accentVar);
  if (count === 1) return colors;
  const rgb = hexToRgb(baseHex);
  const baseHsl = rgb ? rgbToHsl(rgb) : {h: 220, s: 85, l: 56};
  const rotations = [180, 120, -120, 60, -60, 90, -90, 30, -30];
  const needed = count - 1;
  for (let i = 0; i < needed; i += 1) {
    const angle = rotations[i] != null ? rotations[i] : (360 / (needed + 1)) * (i + 1);
    const rotatedHue = rotateHue(baseHsl.h, angle);
    const hex = hslToHex(rotatedHue, baseHsl.s, baseHsl.l);
    colors.push(hex);
  }
  return colors;
}

function createLookupStore() {
  try {
    if (typeof globalThis !== 'undefined' && typeof globalThis.Map === 'function') {
      return new globalThis.Map();
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && typeof window.Map === 'function') {
      return new window.Map();
    }
  } catch (_) {}
  const store = Object.create(null);
  return {
    has(key) {
      return Object.prototype.hasOwnProperty.call(store, key);
    },
    get(key) {
      return store[key];
    },
    set(key, value) {
      store[key] = value;
      return this;
    },
  };
}

function normalizeText(value) {
  if (value == null) return '';
  try {
    return String(value).trim();
  } catch (_) {
    return '';
  }
}

function normalizeKeyValue(entry) {
  if (!entry) return '';
  const value = entry.id ?? entry.value ?? entry.key ?? entry.slug;
  return normalizeText(value);
}

function normalizeKeyLabel(entry) {
  if (!entry) return '';
  const label = entry.label ?? entry.name ?? entry.title ?? entry.text;
  return normalizeText(label);
}

function normalizeKeyLegendEntries(entries, options = {}) {
  if (!Array.isArray(entries)) return [];
  const resolveVariant = typeof options.resolveVariant === 'function' ? options.resolveVariant : null;
  const variantProp = options.variantProp || 'variant';
  return entries
    .map((entry) => {
      if (!entry) return null;
      const keyValue = normalizeKeyValue(entry);
      const label = normalizeKeyLabel(entry);
      if (!keyValue || !label) return null;
      const normalized = {
        keyValue,
        label,
      };
      if (resolveVariant) {
        const variant = resolveVariant(entry);
        if (variant) normalized[variantProp] = variant;
      }
      return normalized;
    })
    .filter(Boolean);
}

function buildKeyLegend(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return {groups: [], lookup: null};
  }
  const lookup = createLookupStore();
  const palette = generateLegendColors(entries.length);
  const groups = entries.map((entry, index) => {
    const color = palette[index] || palette[0] || DEFAULT_ACCENT_HEX;
    const group = {
      ...entry,
      color,
    };
    lookup.set(entry.keyValue, group);
    return group;
  });
  return {groups, lookup};
}

export {DEFAULT_ACCENT_HEX, normalizeKeyLegendEntries, buildKeyLegend};
