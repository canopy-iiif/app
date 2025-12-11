const UNIT_TOKEN = "__canopySliderUnit";
const UNIT_REM = "rem";
const DEFAULT_FONT_SIZE = 16;
let cachedRootFontSize = null;

// Shared defaults applied to every slider instance (manual + generated).
export const sliderOptions = {
  breakpoints: {
    400: {
      slidesPerView: 2,
      spaceBetween: rem(1),
    },
    640: {
      slidesPerView: 3,
      spaceBetween: rem(1.618),
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: rem(1.618),
    },
  },
};

export function rem(value) {
  const numeric = typeof value === "number" ? value : parseFloat(value);
  return {
    [UNIT_TOKEN]: UNIT_REM,
    value: Number.isFinite(numeric) ? numeric : 0,
  };
}

function cloneBreakpoints(source) {
  if (!source || typeof source !== "object") return undefined;
  const clone = {};
  Object.entries(source).forEach(([key, entry]) => {
    clone[key] = entry && typeof entry === "object" ? {...entry} : {};
  });
  return clone;
}

function cloneOptions(options = {}) {
  const clone = {...options};
  if (options.breakpoints && typeof options.breakpoints === "object") {
    clone.breakpoints = cloneBreakpoints(options.breakpoints);
  }
  return clone;
}

export function mergeSliderOptions(overrides) {
  const base = cloneOptions(sliderOptions);
  const incoming = cloneOptions(overrides || {});
  const merged = {
    ...base,
    ...incoming,
  };
  if (base.breakpoints || incoming.breakpoints) {
    merged.breakpoints = {
      ...(base.breakpoints || {}),
      ...(incoming.breakpoints || {}),
    };
  }
  return merged;
}

function hasBrowserEnv() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function measureRootFontSize() {
  if (!hasBrowserEnv()) return DEFAULT_FONT_SIZE;
  if (cachedRootFontSize !== null) return cachedRootFontSize;
  let size = DEFAULT_FONT_SIZE;
  try {
    const root = window.document && window.document.documentElement;
    if (root && window.getComputedStyle) {
      const computed = window.getComputedStyle(root).fontSize;
      const parsed = parseFloat(computed);
      if (Number.isFinite(parsed)) size = parsed;
    }
  } catch (_) {
    size = DEFAULT_FONT_SIZE;
  }
  cachedRootFontSize = size;
  return size;
}

function convertSpacing(value) {
  if (!hasBrowserEnv()) return value;
  if (value && typeof value === "object" && value[UNIT_TOKEN] === UNIT_REM) {
    const remValue =
      typeof value.value === "number" ? value.value : parseFloat(value.value);
    if (!Number.isFinite(remValue)) return value;
    return remValue * measureRootFontSize();
  }
  return value;
}

function normalizeBreakpoints(breakpoints) {
  if (!breakpoints || typeof breakpoints !== "object") return breakpoints;
  const normalized = {};
  Object.entries(breakpoints).forEach(([key, entry]) => {
    const clone = entry && typeof entry === "object" ? {...entry} : {};
    if (Object.prototype.hasOwnProperty.call(clone, "spaceBetween")) {
      clone.spaceBetween = convertSpacing(clone.spaceBetween);
    }
    normalized[key] = clone;
  });
  return normalized;
}

export function normalizeSliderOptions(options) {
  const clone = cloneOptions(options || {});
  if (!hasBrowserEnv()) return clone;
  if (Object.prototype.hasOwnProperty.call(clone, "spaceBetween")) {
    clone.spaceBetween = convertSpacing(clone.spaceBetween);
  }
  if (clone.breakpoints) {
    clone.breakpoints = normalizeBreakpoints(clone.breakpoints);
  }
  return clone;
}
