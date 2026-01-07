/* eslint-disable import/namespace */
import React from "react";
import * as radixColors from "@radix-ui/colors";

const COLOR_SCALES = [
  {label: "Accent", prefix: "--color-accent"},
  {label: "Gray", prefix: "--color-gray"},
];

const COLOR_STOPS = [
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

const ACCENT_COLOR_NAMES = [
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
];

const GRAY_COLOR_NAMES = ["gray", "mauve", "slate", "sage", "olive", "sand"];
const APPEARANCES = ["light", "dark"];
const DEFAULTS = {
  appearance: "light",
  accentColor: "indigo",
  grayColor: "slate",
};
const LEVELS = COLOR_STOPS;
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

const Section = ({title, description, children}) => (
  <div className="canopy-theme-showcase__section">
    <h3 className="canopy-theme-showcase__section-title">{title}</h3>
    {description ? (
      <p className="canopy-theme-showcase__section-description">
        {description}
      </p>
    ) : null}
    {children}
  </div>
);

const ColorScaleRow = ({label, prefix}) => (
  <div className="canopy-theme-showcase__scale-row">
    <div className="canopy-theme-showcase__scale-label">
      <strong>{label}</strong>
    </div>
    <div className="canopy-theme-showcase__scale-track">
      {COLOR_STOPS.map((stop) => (
        <div
          key={`${label}-${stop}`}
          className="canopy-theme-showcase__scale-stop"
        >
          <span
            className="canopy-theme-showcase__scale-chip"
            style={{backgroundColor: `var(${prefix}-${stop})`}}
          />
          <span className="canopy-theme-showcase__scale-token">{stop}</span>
        </div>
      ))}
    </div>
  </div>
);

const AVAILABLE = new Set(
  Object.keys(radixColors).filter(
    (key) =>
      /^[a-z]+$/i.test(key) && radixColors[key] && radixColors[key][`${key}1`]
  )
);

function normalizeAppearance(raw) {
  if (!raw) return "light";
  return String(raw).trim().toLowerCase() === "dark" ? "dark" : "light";
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

function resolveRadixPalette(name, appearance) {
  if (!name || !AVAILABLE.has(name)) return null;
  const paletteKey = appearance === "dark" ? `${name}Dark` : name;
  const palette = radixColors[paletteKey];
  if (palette && palette[`${name}1`]) return palette;
  const fallback = radixColors[name];
  return fallback && fallback[`${name}1`] ? fallback : null;
}

function toTailwindScale(name, options = {}) {
  if (!name || !AVAILABLE.has(name)) return null;
  const appearance = normalizeAppearance(options.appearance);
  const palette = resolveRadixPalette(name, appearance);
  if (!palette) return null;
  const scale = {};
  const darken900Amount = normalizeDarkenAmount(options.darken900Amount);
  for (const lvl of LEVELS) {
    const radixStep = STEP_MAP[lvl];
    const key = `${name}${radixStep}`;
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
  const darkestKey = `${name}${STEP_MAP["900"]}`;
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

function buildPreviewData() {
  const data = {
    appearances: APPEARANCES,
    accentColors: ACCENT_COLOR_NAMES,
    grayColors: GRAY_COLOR_NAMES,
    defaults: DEFAULTS,
    scales: {},
  };
  for (const appearance of APPEARANCES) {
    const accentScales = {};
    const grayScales = {};
    for (const accent of ACCENT_COLOR_NAMES) {
      const scale = toTailwindScale(accent, {appearance});
      if (scale) accentScales[accent] = scale;
    }
    for (const gray of GRAY_COLOR_NAMES) {
      const scale = toTailwindScale(gray, {
        appearance,
        darken900Amount: 0.4,
        saturate700: false,
      });
      if (scale) grayScales[gray] = scale;
    }
    data.scales[appearance] = {accent: accentScales, gray: grayScales};
  }
  return data;
}

const PREVIEW_DATA = buildPreviewData();

function encodeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const ColorsLabeled = ({colors, type, getRadixSwatch}) => (
  <div className="canopy-theme-showcase__swatch-grid">
    {colors.map((name) => {
      const colorValue = getRadixSwatch(name);
      return (
        <button
          key={`${type}-${name}`}
          type="button"
          className="canopy-theme-showcase__swatch"
          data-theme-swatch
          data-theme-swatch-type={type}
          data-theme-swatch-value={name}
          aria-pressed="false"
        >
          <span
            className="canopy-theme-showcase__swatch-chip"
            style={{background: colorValue || "var(--color-gray-200)"}}
          />
          <span className="canopy-theme-showcase__swatch-label">{name}</span>
        </button>
      );
    })}
  </div>
);

export default function ThemeShowcase() {
  const accentColors = ACCENT_COLOR_NAMES;
  const grayColors = GRAY_COLOR_NAMES;

  const getRadixSwatch = (name) => {
    if (!name) return null;
    const scale = radixColors[name];
    if (!scale) return null;
    return scale[`${name}9`] || Object.values(scale)[8];
  };

  const styles = `
    .canopy-theme-showcase {
      margin: 2.618rem 0;
      padding: 1.5rem;
      border: 1px solid color-mix(in srgb, var(--color-gray-400) 40%, transparent);
      border-radius: 0.85rem;
      background: color-mix(in srgb, var(--color-gray-50) 78%, transparent);
    }
    .canopy-theme-showcase__toolbar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-bottom: 1px solid var(--color-gray-200);
      padding-bottom: 1.25rem;
      margin-bottom: 2rem;
    }
    @media (min-width: 720px) {
      .canopy-theme-showcase__toolbar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .canopy-theme-showcase__toolbar-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .canopy-theme-showcase__toolbar-group--right {
      align-items: flex-start;
    }
    @media (min-width: 720px) {
      .canopy-theme-showcase__toolbar-group--right {
        align-items: flex-end;
      }
    }
    .canopy-theme-showcase__toolbar-label {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-gray-muted);
    }
    .canopy-theme-showcase__toolbar-buttons {
      display: inline-flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .canopy-theme-showcase__toolbar-button {
      border-radius: 999px;
      border: 1px solid var(--color-gray-300);
      background: var(--color-gray-50);
      color: var(--color-gray-900);
      padding: 0.3rem 0.9rem;
      font-size: 0.85rem;
      cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    }
    .canopy-theme-showcase__toolbar-button.is-active {
      border-color: var(--color-accent-default);
      color: var(--color-accent-default);
      background: color-mix(in srgb, var(--color-accent-100) 65%, transparent);
    }
    .canopy-theme-showcase__toolbar-reset {
      border-radius: 999px;
      border: 1px solid var(--color-gray-400);
      background: transparent;
      padding: 0.35rem 1.2rem;
      font-size: 0.85rem;
      cursor: pointer;
      color: var(--color-gray-900);
    }
    .canopy-theme-showcase__status {
      font-size: 0.85rem;
      color: var(--color-gray-muted);
    }
    .canopy-theme-showcase__section {
      margin: 2.618rem 0;
    }
    .canopy-theme-showcase__section:first-of-type {
      margin-top: 0;
    }
    .canopy-theme-showcase__section:last-of-type {
      margin-bottom: 0;
    }
    .canopy-theme-showcase__section-title {
      margin: 0 0 0.382rem;
      font-size: 1.382rem;
    }
    .canopy-theme-showcase__section-description {
      margin: 0 0 1rem;
      color: var(--color-gray-muted);
      line-height: 1.5;
    }
    .canopy-theme-showcase__scale-group {
      display: flex;
      flex-direction: column;
      gap: 1.618rem;
    }
    .canopy-theme-showcase__scale-row {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .canopy-theme-showcase__scale-label {
      min-width: 90px;
      font-size: 0.9222rem;
    }
    .canopy-theme-showcase__scale-track {
      display: flex;
      flex: 1;
      overflow: auto;
    }
    .canopy-theme-showcase__scale-stop {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.382rem;
      overflow: hidden;

      &:first-child {
        .canopy-theme-showcase__scale-chip {
          border-top-left-radius: 3px;
          border-bottom-left-radius: 3px;
        }
      }

      &:last-child {
        .canopy-theme-showcase__scale-chip {
          border-top-right-radius: 3px;
          border-bottom-right-radius: 3px;
        }
      }
    }
    .canopy-theme-showcase__scale-chip {
      display: block;
      width: 100%;
      min-height: 2.618rem;
    }
    .canopy-theme-showcase__scale-token {
      font-size: 0.8333rem;
    }
    .canopy-theme-showcase__swatch-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .canopy-theme-showcase__swatch {
      width: 5.5rem;
      border: 1px solid var(--color-gray-200);
      border-radius: 0.75rem;
      background: var(--color-gray-50);
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .canopy-theme-showcase__swatch:focus-visible {
      outline: 2px solid var(--color-accent-default);
      outline-offset: 3px;
    }
    .canopy-theme-showcase__swatch[data-swatch-active="true"] {
      border-color: var(--color-accent-default);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-200) 70%, transparent);
    }
    .canopy-theme-showcase__swatch-chip {
      width: 100%;
      height: 2.618rem;
      border-radius: 0.5rem;
    }
    .canopy-theme-showcase__swatch-label {
      font-size: 0.8333rem;
      margin-top: 0.1rem;
      font-weight: 500;
      text-transform: capitalize;
    }
    .canopy-theme-showcase__swatch-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    @media (min-width: 520px) {
      .canopy-theme-showcase__swatch-controls {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .canopy-theme-showcase__clear-button {
      border: none;
      background: none;
      color: var(--color-accent-default);
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: underline;
    }
  `;

  return (
    <div className="canopy-theme-showcase" data-theme-showcase>
      <style dangerouslySetInnerHTML={{__html: styles}} />
      <div className="canopy-theme-showcase__toolbar">
        <div className="canopy-theme-showcase__toolbar-group">
          <span className="canopy-theme-showcase__toolbar-label">
            Appearance preview
          </span>
          <div className="canopy-theme-showcase__toolbar-buttons">
            {["light", "dark"].map((mode) => {
              const label = `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
              const baseClass = "canopy-theme-showcase__toolbar-button";
              const isDefault = mode === DEFAULTS.appearance;
              const className = isDefault ? `${baseClass} is-active` : baseClass;
              return (
                <button
                  key={mode}
                  type="button"
                  className={className}
                  data-theme-appearance={mode}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="canopy-theme-showcase__toolbar-group canopy-theme-showcase__toolbar-group--right">
          <button
            type="button"
            className="canopy-theme-showcase__toolbar-reset"
            data-theme-reset
          >
            Reset overrides
          </button>
          <span className="canopy-theme-showcase__status" data-theme-showcase-status>
            No overrides active
          </span>
        </div>
      </div>
      <Section
        title="Color scales"
        description="Accent and gray ramps from the active theme."
      >
        <div style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
          {COLOR_SCALES.map((scale) => (
            <ColorScaleRow
              key={scale.label}
              label={scale.label}
              prefix={scale.prefix}
            />
          ))}
        </div>
      </Section>
      <Section
        title="Accent color palette options"
        description="Click a swatch to temporarily override the accent palette."
      >
        <div className="canopy-theme-showcase__swatch-controls">
          <span>
            Active accent: {" "}
            <strong data-theme-active-label="accent">
              {DEFAULTS.accentColor}
            </strong>
          </span>
          <button
            type="button"
            className="canopy-theme-showcase__clear-button"
            data-theme-clear="accent"
          >
            Clear accent override
          </button>
        </div>
        <ColorsLabeled colors={accentColors} type="accent" getRadixSwatch={getRadixSwatch} />
      </Section>
      <Section
        title="Gray color palette options"
        description="Click a swatch to preview the neutral ramp for surfaces and text."
      >
        <div className="canopy-theme-showcase__swatch-controls">
          <span>
            Active gray: {" "}
            <strong data-theme-active-label="gray">{DEFAULTS.grayColor}</strong>
          </span>
          <button
            type="button"
            className="canopy-theme-showcase__clear-button"
            data-theme-clear="gray"
          >
            Clear gray override
          </button>
        </div>
        <ColorsLabeled colors={grayColors} type="gray" getRadixSwatch={getRadixSwatch} />
      </Section>
      <script
        type="application/json"
        data-theme-showcase-values
        dangerouslySetInnerHTML={{__html: encodeJson(PREVIEW_DATA)}}
      />
    </div>
  );
}
