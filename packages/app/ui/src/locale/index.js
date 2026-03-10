import React from "react";
import getSafePageContext from "../layout/pageContext.js";
import defaultMessages from "../../../lib/default-locale.js";

function getGlobalScope() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return null;
}

function readRuntimeMessages() {
  const scope = getGlobalScope();
  const candidate = scope && scope.CANOPY_LOCALE_MESSAGES;
  if (candidate && typeof candidate === "object") return candidate;
  return defaultMessages || {};
}

export function accessPath(obj, path) {
  if (!obj || typeof obj !== "object" || !path) return undefined;
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    const key = String(part).trim();
    if (!key || !(key in current)) return undefined;
    current = current[key];
  }
  return current;
}

export function formatTemplate(template, replacements = {}) {
  if (template == null) return template;
  const str = String(template);
  if (!replacements || typeof replacements !== "object") return str;
  return str.replace(/\{([^}]+)\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(replacements, key)) return match;
    const value = replacements[key];
    if (value == null) return match;
    return String(value);
  });
}

export function useLocaleMessages() {
  const PageContext = getSafePageContext();
  const context = PageContext ? React.useContext(PageContext) : null;
  const siteMessages =
    context &&
    context.site &&
    context.site.localeMessages &&
    typeof context.site.localeMessages === "object"
      ? context.site.localeMessages
      : null;
  return siteMessages || readRuntimeMessages();
}

export function useLocale() {
  const messages = useLocaleMessages();
  const getString = React.useCallback(
    (path, fallback) => {
      const value = path ? accessPath(messages, path) : undefined;
      if (typeof value === "string" || typeof value === "number") {
        return value;
      }
      return fallback;
    },
    [messages],
  );
  const formatString = React.useCallback(
    (path, fallback, replacements) => {
      const template = path ? accessPath(messages, path) : undefined;
      const resolved = template != null ? template : fallback;
      if (resolved == null) return resolved;
      return formatTemplate(resolved, replacements);
    },
    [messages],
  );
  return {messages, getString, formatString};
}

export function useLocaleString(path, fallback, replacements) {
  const {formatString} = useLocale();
  return formatString(path, fallback, replacements);
}
