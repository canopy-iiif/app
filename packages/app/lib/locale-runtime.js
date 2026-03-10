const DEFAULT_LOCALE_MESSAGES = require('./default-locale');

function getGlobalScope() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  return null;
}

function accessPath(obj, path) {
  if (!obj || typeof obj !== 'object' || !path) return undefined;
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    const key = String(part).trim();
    if (!key || !(key in current)) return undefined;
    current = current[key];
  }
  return current;
}

function formatTemplate(template, replacements = {}) {
  if (template == null) return template;
  const str = String(template);
  if (!replacements || typeof replacements !== 'object') return str;
  return str.replace(/\{([^}]+)\}/g, (match, key) => {
    const replacement = Object.prototype.hasOwnProperty.call(replacements, key)
      ? replacements[key]
      : undefined;
    if (replacement == null) return match;
    return String(replacement);
  });
}

function getRuntimeLocaleMessages() {
  const scope = getGlobalScope();
  const candidate = scope && scope.CANOPY_LOCALE_MESSAGES;
  if (candidate && typeof candidate === 'object') return candidate;
  return DEFAULT_LOCALE_MESSAGES || {};
}

function getRuntimeLocaleCode() {
  const scope = getGlobalScope();
  const value = scope && scope.CANOPY_LOCALE_CODE;
  return typeof value === 'string' ? value : '';
}

function getRuntimeMessage(path, fallback) {
  const messages = getRuntimeLocaleMessages();
  const value = accessPath(messages, path);
  if (value == null) return fallback;
  return value;
}

function formatRuntimeMessage(path, fallback, replacements) {
  const template = getRuntimeMessage(path, fallback);
  if (template == null) return template;
  return formatTemplate(template, replacements);
}

module.exports = {
  getRuntimeLocaleMessages,
  getRuntimeLocaleCode,
  getRuntimeMessage,
  formatRuntimeMessage,
  formatTemplate,
  accessPath,
};
