const fs = require("fs");
const yaml = require("js-yaml");
const radixColors = require("@radix-ui/colors");
const {resolveCanopyConfigPath} = require("../lib/config-path");

const DEFAULT_ACCENT = "indigo";
const DEFAULT_GRAY = "slate";
const DEFAULT_APPEARANCE = "light";
const DEBUG_FLAG_RAW = String(process.env.CANOPY_DEBUG_THEME || "");
const DEBUG_ENABLED = /^(1|true|yes|on)$/i.test(DEBUG_FLAG_RAW.trim());

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;
  try {
    console.log("[canopy-theme]", ...args);
  } catch (_) {}
}

const LEVELS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
];
const STEP_MAP = {
  50: 1,
  100: 3,
  200: 4,
  300: 6,
  400: 7,
  500: 8,
  600: 9,
  700: 10,
  800: 11,
  900: 12,
};

const AVAILABLE = new Set(
  Object.keys(radixColors).filter(
    (key) =>
      /^[a-z]+$/.test(key) && radixColors[key] && radixColors[key][`${key}1`]
  )
);

const APPEARANCES = new Set(["light", "dark"]);

function readYamlConfig(cfgPath) {
  try {
    if (!cfgPath) return {};
    if (!fs.existsSync(cfgPath)) {
      debugLog("config not found; falling back to defaults", cfgPath);
      return {};
    }
    const raw = fs.readFileSync(cfgPath, "utf8");
    const data = yaml.load(raw) || {};
    debugLog("loaded config", cfgPath);
    return data;
  } catch (_) {
    return {};
  }
}

function normalizePaletteName(raw) {
  if (!raw) return "";
  const cleaned = String(raw).trim().toLowerCase();
  const compact = cleaned.replace(/[^a-z]/g, "");
  return AVAILABLE.has(compact) ? compact : "";
}

function normalizeAppearance(raw) {
  if (!raw) return DEFAULT_APPEARANCE;
  const cleaned = String(raw).trim().toLowerCase();
  return APPEARANCES.has(cleaned) ? cleaned : DEFAULT_APPEARANCE;
}

function resolveRadixPalette(name, appearance) {
  if (!name || !AVAILABLE.has(name)) return null;
  const paletteKey = appearance === "dark" ? `${name}Dark` : name;
  const palette = radixColors[paletteKey];
  if (palette && palette[`${name}1`]) return palette;
  const fallback = radixColors[name];
  return fallback && fallback[`${name}1`] ? fallback : null;
}

function darkenHex(hex, amount = 0.15) {
  if (!hex) return hex;
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const toHex = (value) => clamp(value).toString(16).padStart(2, "0");
  const factor = 1 - amount;
  return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`;
}

function lightenHex(hex, amount = 0.15) {
  if (!hex) return hex;
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const toHex = (value) => clamp(value).toString(16).padStart(2, "0");
  const adjust = (value) => value + (255 - value) * amount;
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

function adjustSaturation(hex, amount = 0.15) {
  if (!hex) return hex;
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
  const num = parseInt(normalized, 16);
  let r = ((num >> 16) & 255) / 255;
  let g = ((num >> 8) & 255) / 255;
  let b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  const delta = Number(amount);
  if (!Number.isFinite(delta) || delta === 0) return hex;
  s = Math.max(0, Math.min(1, s + delta));
  const hueToRgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let rOut;
  let gOut;
  let bOut;
  if (s === 0) {
    rOut = gOut = bOut = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rOut = hueToRgb(p, q, h + 1 / 3);
    gOut = hueToRgb(p, q, h);
    bOut = hueToRgb(p, q, h - 1 / 3);
  }
  const toHex = (value) =>
    Math.round(Math.max(0, Math.min(1, value)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`;
}

function mixHexColors(colorA, colorB, amount = 0.5) {
  const normalize = (hex) =>
    hex && /^[0-9a-fA-F]{6}$/.test(hex.replace("#", ""))
      ? hex.replace("#", "")
      : null;
  const first = normalize(colorA);
  const second = normalize(colorB);
  if (!first || !second) return colorA || colorB || null;
  const a = parseInt(first, 16);
  const b = parseInt(second, 16);
  const clampAmount = Math.max(0, Math.min(1, Number(amount) || 0));
  const mixChannel = (shift) =>
    Math.round(
      ((a >> shift) & 255) +
        (((b >> shift) & 255) - ((a >> shift) & 255)) * clampAmount
    );
  const toHex = (value) => value.toString(16).padStart(2, "0");
  const r = mixChannel(16);
  const g = mixChannel(8);
  const bl = mixChannel(0);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function normalizeDarkenAmount(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.min(0.95, Math.max(0, value));
}

function toTailwindScale(name, options = {}) {
  if (!name || !AVAILABLE.has(name)) return null;
  const appearance = normalizeAppearance(options.appearance);
  const palette = resolveRadixPalette(name, appearance);
  if (!palette) return null;
  const prefix = name;
  const scale = {};
  const darken900Amount = normalizeDarkenAmount(options.darken900Amount);
  const steps = STEP_MAP;
  for (const lvl of LEVELS) {
    const radixStep = steps[lvl];
    const key = `${prefix}${radixStep}`;
    const value = palette[key];
    if (!value) return null;
    scale[lvl] = value;
  }
  const saturate700 = options.saturate700 !== false;
  if (scale["700"]) {
    let adjusted =
      appearance === "dark"
        ? lightenHex(scale["700"], 0.15)
        : darkenHex(scale["700"], 0.15);
    if (saturate700) adjusted = adjustSaturation(adjusted, 0.15);
    scale["700"] = adjusted;
  }
  const darkestKey = `${prefix}${steps["900"]}`;
  if (scale["800"] && palette[darkestKey]) {
    const amount = darken900Amount != null ? darken900Amount : 0.25;
    scale["900"] =
      appearance === "dark"
        ? lightenHex(palette[darkestKey], amount)
        : darkenHex(palette[darkestKey], amount);
  }
  if (scale["800"] && scale["900"]) {
    scale["800"] = mixHexColors(scale["800"], scale["900"], 0.65);
  }
  return scale;
}

function buildVariablesMap(brandScale, grayScale, options = {}) {
  const appearance = normalizeAppearance(options.appearance);
  const vars = {};
  if (brandScale) {
    for (const lvl of LEVELS) {
      const value = brandScale[lvl];
      if (value) vars[`--color-accent-${lvl}`] = value;
    }
    if (brandScale["700"]) vars["--color-accent-default"] = brandScale["700"];
  }
  if (grayScale) {
    for (const lvl of LEVELS) {
      const value = grayScale[lvl];
      if (value) vars[`--color-gray-${lvl}`] = value;
    }
    if (grayScale["900"]) vars["--color-gray-default"] = grayScale["900"];
    if (grayScale["600"]) vars["--color-gray-muted"] = grayScale["600"];
  }
  if (brandScale && grayScale) {
    if (brandScale["700"])
      vars["--colors-accent"] = `${brandScale["700"]} !important`;
    if (brandScale["800"])
      vars["--colors-accentAlt"] = `${brandScale["800"]} !important`;
    if (brandScale["400"])
      vars["--colors-accentMuted"] = `${brandScale["400"]} !important`;
    if (grayScale["900"]) {
      const primary = `${grayScale["900"]} !important`;
      vars["--colors-primary"] = primary;
      vars["--colors-primaryAlt"] = primary;
      vars["--colors-primaryMuted"] = primary;
    }
    if (grayScale["50"]) {
      const secondary = `${grayScale["50"]} !important`;
      vars["--colors-secondary"] = secondary;
      vars["--colors-secondaryAlt"] = secondary;
      vars["--colors-secondaryMuted"] = secondary;
    }
  }
  vars["color-scheme"] = appearance === "dark" ? "dark" : "light";
  return vars;
}

function variablesToCss(vars) {
  const entries = Object.entries(vars || {});
  if (!entries.length) return "";
  const body = entries
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join("\n");
  return `@layer properties {\n  :root {\n${body}\n  }\n  :host {\n${body}\n  }\n}`;
}

function buildSassConfig(brandScale, grayScale) {
  return "";
}

function loadCanopyTheme(options = {}) {
  const cfgPath = resolveCanopyConfigPath(options);
  const cfg = readYamlConfig(cfgPath);
  const theme = (cfg && cfg.theme) || {};
  const accentRequested = theme && theme.accentColor;
  const grayRequested = theme && theme.grayColor;
  const appearanceRequested = theme && theme.appearance;
  const appearance = normalizeAppearance(appearanceRequested);

  let accentName = normalizePaletteName(accentRequested);
  let accentScale = accentName
    ? toTailwindScale(accentName, {appearance})
    : null;
  let accentFallback = false;
  if (!accentScale) {
    accentFallback = true;
    accentName = DEFAULT_ACCENT;
    accentScale = toTailwindScale(DEFAULT_ACCENT, {appearance});
  }

  let grayName = normalizePaletteName(grayRequested);
  let grayScale = grayName
    ? toTailwindScale(grayName, {
        appearance,
        darken900Amount: 0.4,
        saturate700: false,
      })
    : null;
  let grayFallback = false;
  if (!grayScale) {
    grayFallback = true;
    grayName = DEFAULT_GRAY;
    grayScale = toTailwindScale(DEFAULT_GRAY, {
      appearance,
      darken900Amount: 0.4,
      saturate700: false,
    });
  }

  const dynamicVars = buildVariablesMap(accentScale, grayScale, {appearance});
  const mergedVars = dynamicVars;
  const css = variablesToCss(mergedVars);
  const sassConfig = buildSassConfig(accentScale, grayScale);

  debugLog("resolved theme", {
    configPath: cfgPath,
    requested: {
      accent: accentRequested || null,
      gray: grayRequested || null,
      appearance: appearanceRequested || null,
    },
    resolved: {
      appearance,
      accent: accentName,
      gray: grayName,
      accentFallback,
      grayFallback,
      brandSamples: accentScale
        ? {
            50: accentScale["50"],
            500: accentScale["500"],
            900: accentScale["900"],
          }
        : null,
      graySamples: grayScale
        ? {50: grayScale["50"], 500: grayScale["500"], 900: grayScale["900"]}
        : null,
    },
  });

  return {
    appearance,
    accent: {name: accentName, scale: accentScale},
    gray: {name: grayName, scale: grayScale},
    variables: mergedVars,
    css,
    sassConfig,
  };
}

module.exports = {
  loadCanopyTheme,
  toTailwindScale,
  normalizePaletteName,
  normalizeAppearance,
  AVAILABLE_PALETTES: Array.from(AVAILABLE).sort(),
  __DEBUG_ENABLED: DEBUG_ENABLED,
  variablesToCss,
  buildSassConfig,
};
