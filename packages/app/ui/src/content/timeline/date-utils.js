const FALLBACK_LOCALE = (() => {
  try {
    return new Intl.Locale("en-US");
  } catch (_) {
    return "en-US";
  }
})();

export function createLocale(localeValue) {
  if (!localeValue) return FALLBACK_LOCALE;
  if (typeof Intl !== "undefined" && localeValue instanceof Intl.Locale)
    return localeValue;
  try {
    return new Intl.Locale(localeValue);
  } catch (_) {
    return FALLBACK_LOCALE;
  }
}

function parseMonthIndex(name = "", locale = FALLBACK_LOCALE) {
  const localeId =
    typeof locale === "string" ? locale : locale && locale.baseName
      ? locale.baseName
      : "en-US";
  const normalized = String(name || "")
    .trim()
    .toLocaleLowerCase(localeId);
  if (!normalized) return 0;
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const idx = months.indexOf(normalized);
  return idx === -1 ? 0 : idx;
}

function parseStructuredInput(value) {
  if (!value || typeof value !== "object") return null;
  const {year, month, day} = value;
  if (!Number.isFinite(Number(year))) return null;
  const y = Number(year);
  const m = Number.isFinite(Number(month)) ? Number(month) - 1 : 0;
  const d = Number.isFinite(Number(day)) ? Number(day) : 1;
  return new Date(Date.UTC(y, Math.max(0, Math.min(11, m)), Math.max(1, Math.min(31, d))));
}

export function createDateFromInput(value, {locale} = {}) {
  const loc = createLocale(locale);
  if (value instanceof Date) return new Date(value.getTime());
  if (Number.isFinite(Number(value))) {
    const year = Number(value);
    return new Date(Date.UTC(year, 0, 1));
  }
  if (value && typeof value === "object") {
    const structured = parseStructuredInput(value);
    if (structured) return structured;
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const isoYear = text.match(/^(\d{4})$/);
  if (isoYear) {
    return new Date(Date.UTC(Number(isoYear[1]), 0, 1));
  }
  const isoYearMonth = text.match(/^(\d{4})-(\d{2})$/);
  if (isoYearMonth) {
    return new Date(
      Date.UTC(Number(isoYearMonth[1]), Number(isoYearMonth[2]) - 1, 1)
    );
  }
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    return new Date(
      Date.UTC(
        Number(isoDate[1]),
        Number(isoDate[2]) - 1,
        Number(isoDate[3])
      )
    );
  }
  const monthDayYear = text.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,)?\s*(\d{4})$/);
  if (monthDayYear) {
    const month = parseMonthIndex(monthDayYear[1], loc);
    const day = Number(monthDayYear[2]);
    const year = Number(monthDayYear[3]);
    return new Date(Date.UTC(year, month, day));
  }
  const monthYear = text.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const month = parseMonthIndex(monthYear[1], loc);
    const year = Number(monthYear[2]);
    return new Date(Date.UTC(year, month, 1));
  }
  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) return fallback;
  const alt = new Date(Date.parse(text));
  if (!Number.isNaN(alt.getTime())) return alt;
  return null;
}

export function formatDateLabel(date, {granularity = "day", locale} = {}) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const loc = createLocale(locale);
  const baseName = typeof loc === "string" ? loc : loc.baseName || "en-US";
  const options = {year: "numeric"};
  if (granularity === "month" || granularity === "day") {
    options.month = "long";
  }
  if (granularity === "day") {
    options.day = "numeric";
  }
  options.timeZone = "UTC";
  try {
    const formatter = new Intl.DateTimeFormat(baseName, options);
    return formatter.format(date);
  } catch (_) {
    return date.toISOString().slice(0, 10);
  }
}

export function normalizeRange(range = {}) {
  const {start, end, granularity = "year", locale} = range || {};
  const loc = createLocale(locale);
  const startDate = createDateFromInput(start || new Date(), {locale: loc}) ||
    new Date(Date.UTC(0, 0, 1));
  let endDate = createDateFromInput(end, {locale: loc});
  if (!endDate) {
    const copy = new Date(startDate.getTime());
    copy.setUTCFullYear(copy.getUTCFullYear() + 1);
    endDate = copy;
  }
  if (endDate <= startDate) {
    const nextDay = new Date(startDate.getTime());
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    endDate = nextDay;
  }
  const span = Math.max(1, endDate - startDate);
  return {
    startDate,
    endDate,
    span,
    granularity: granularity === "month" || granularity === "day" ? granularity : "year",
    locale: loc,
  };
}

export function buildPointMetadata({value, granularity, locale}) {
  const date = createDateFromInput(value, {locale});
  return {
    date,
    label: formatDateLabel(date, {granularity, locale}),
    timestamp: date ? date.getTime() : null,
  };
}

export function clampProgress(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
