const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {resolveCanopyConfigPath} = require('./config-path');

const CONTENT_DIR = path.resolve('content');

let cachedLocales = null;
let cachedMessages = null;
const DEFAULT_LOCALE_ROUTES = {
  works: 'works',
  search: 'search',
};

function normalizeLocale(entry, index) {
  if (!entry || typeof entry !== 'object') return null;
  const lang = typeof entry.lang === 'string' ? entry.lang.trim() : '';
  if (!lang) return null;
  const label =
    typeof entry.label === 'string' && entry.label.trim()
      ? entry.label.trim()
      : lang.toUpperCase();
  return {lang, label, default: entry.default === true, index};
}

function ensureLocales(list) {
  if (!Array.isArray(list) || !list.length) {
    return [
      {
        lang: 'en',
        label: 'English',
        default: true,
      },
    ];
  }
  const normalized = list
    .map((item, index) => normalizeLocale(item, index))
    .filter(Boolean);
  if (!normalized.length) return ensureLocales(null);
  const explicitDefault = normalized.find((item) => item.default);
  if (explicitDefault) {
    normalized.forEach((item) => {
      item.default = item.index === explicitDefault.index;
    });
  } else {
    normalized[0].default = true;
  }
  return normalized.map(({index, ...rest}) => rest);
}

function readCanopyLocales() {
  if (cachedLocales) return cachedLocales;
  try {
    const cfgPath = resolveCanopyConfigPath();
    if (!fs.existsSync(cfgPath)) {
      cachedLocales = ensureLocales(null);
      return cachedLocales;
    }
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const data = yaml.load(raw) || {};
    cachedLocales = ensureLocales(data.locales);
  } catch (_) {
    cachedLocales = ensureLocales(null);
  }
  return cachedLocales;
}

function readYamlFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) return null;
    const data = yaml.load(raw);
    return data && typeof data === 'object' ? data : null;
  } catch (_) {
    return null;
  }
}

function deepMerge(base, override) {
  if (!override) return base || null;
  if (!base) return override || null;
  const result = Array.isArray(base) ? base.slice() : {...base};
  Object.keys(override).forEach((key) => {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (
      baseVal &&
      overrideVal &&
      typeof baseVal === 'object' &&
      typeof overrideVal === 'object' &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(baseVal, overrideVal);
    } else {
      result[key] = overrideVal;
    }
  });
  return result;
}

function readLocaleMessages(lang) {
  const basePath = path.join(CONTENT_DIR, 'locale.yml');
  const defaultMessages = readYamlFile(basePath) || {};
  if (!lang) return defaultMessages;
  const langPath = path.join(CONTENT_DIR, lang, 'locale.yml');
  const override = readYamlFile(langPath);
  return deepMerge(defaultMessages, override);
}

function normalizeRouteValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^\/+/, '').replace(/\/+$/, '');
}

function readLocaleRoutes(lang) {
  const data = readLocaleMessages(lang);
  const rawRoutes = data && data.routes ? data.routes : null;
  const routes = {};
  Object.keys(DEFAULT_LOCALE_ROUTES).forEach((key) => {
    const candidate = rawRoutes && rawRoutes[key];
    const normalized = normalizeRouteValue(
      typeof candidate === 'string' ? candidate : ''
    );
    routes[key] = normalized || DEFAULT_LOCALE_ROUTES[key];
  });
  return routes;
}

function buildLanguageToggleCopy(locales) {
  const normalized = Array.isArray(locales) ? locales : [];
  const copyMap = {};
  const fallback = readLocaleMessages(null);
  copyMap.__default = fallback && fallback.ui && fallback.ui.languageToggle
    ? {...fallback.ui.languageToggle}
    : {};
  normalized.forEach((locale) => {
    if (!locale || !locale.lang) return;
    const data = readLocaleMessages(locale.lang);
    const localeCopy = data && data.ui && data.ui.languageToggle
      ? data.ui.languageToggle
      : {};
    copyMap[locale.lang] = {...copyMap.__default, ...localeCopy};
  });
  return copyMap;
}

function readCanopyLocalesWithMessages() {
  if (cachedMessages) return cachedMessages;
  const locales = readCanopyLocales();
  const messages = buildLanguageToggleCopy(locales);
  cachedMessages = {locales, messages};
  return cachedMessages;
}

module.exports = {
  readCanopyLocales,
  buildLanguageToggleCopy,
  readCanopyLocalesWithMessages,
  readLocaleMessages,
  readLocaleRoutes,
  DEFAULT_LOCALE_ROUTES,
};
