const React = require('react');
const { withBase, rootRelativeHref, absoluteUrl } = require('./common');
const { getPageContext } = require('./page-context');

const DEFAULT_STYLESHEET_PATH = '/styles/styles.css';

function stylesheetHref(href = DEFAULT_STYLESHEET_PATH) {
  const normalized = rootRelativeHref(href || DEFAULT_STYLESHEET_PATH);
  return withBase(normalized);
}

function Stylesheet(props = {}) {
  const { href = DEFAULT_STYLESHEET_PATH, rel = 'stylesheet', ...rest } = props;
  const resolved = stylesheetHref(href);
  return React.createElement('link', { rel, href: resolved, ...rest });
}

function normalizeText(value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function truncateText(value, max = 240) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  const slice = normalized.slice(0, Math.max(0, max - 3)).trimEnd();
  return `${slice}...`;
}

function resolveOgType(pageType) {
  const type = String(pageType || '').toLowerCase();
  if (type === 'work' || type === 'article') return 'article';
  if (type === 'docs' || type === 'documentation') return 'article';
  return 'website';
}

function resolveUrl(value) {
  if (!value) return '';
  const raw = typeof value === 'string' ? value.trim() : String(value || '');
  if (!raw) return '';
  return absoluteUrl(raw);
}

function Meta(props = {}) {
  const PageContext = getPageContext();
  const context = PageContext ? React.useContext(PageContext) : null;
  const ctxPage = context && context.page ? context.page : null;
  const explicitPage = props.page || null;
  const page = explicitPage || ctxPage || {};
  const fallbackTitle = ctxPage && ctxPage.title ? ctxPage.title : '';
  const metaFromPage = page && page.meta && typeof page.meta === 'object' ? page.meta : null;
  const rawTitle =
    props.title ||
    (metaFromPage && metaFromPage.title) ||
    page.title ||
    fallbackTitle;
  const pageTitle = normalizeText(rawTitle);
  const siteTitle = normalizeText(props.siteTitle) || '';
  const defaultTitle = siteTitle || 'Canopy IIIF';
  const title = pageTitle ? pageTitle : defaultTitle;
  const fullTitle = siteTitle ? (pageTitle ? `${pageTitle} | ${siteTitle}` : siteTitle) : title;
  const rawDescription =
    props.description ||
    (metaFromPage && metaFromPage.description) ||
    page.description ||
    '';
  const description = truncateText(rawDescription);
  const resolvedType = props.type || (metaFromPage && metaFromPage.type) || page.type || '';
  const ogType = resolveOgType(resolvedType);
  const relativeUrl =
    props.url ||
    (metaFromPage && metaFromPage.url) ||
    page.url ||
    page.href ||
    '';
  const absolute = relativeUrl ? absoluteUrl(relativeUrl) : '';
  const ogImageRaw =
    props.image ||
    props.ogImage ||
    (metaFromPage && (metaFromPage.ogImage || metaFromPage.image)) ||
    page.ogImage ||
    page.image ||
    '';
  const image = ogImageRaw ? resolveUrl(ogImageRaw) : '';
  const twitterImageRaw = props.twitterImage || ogImageRaw;
  const twitterImage = twitterImageRaw ? resolveUrl(twitterImageRaw) : '';
  const twitterCard = props.twitterCard || (twitterImage ? 'summary_large_image' : 'summary');

  const nodes = [];
  if (fullTitle) nodes.push(React.createElement('title', { key: 'meta-title' }, fullTitle));
  if (description) nodes.push(React.createElement('meta', { key: 'meta-description', name: 'description', content: description }));
  if (fullTitle) nodes.push(React.createElement('meta', { key: 'og-title', property: 'og:title', content: fullTitle }));
  if (description) nodes.push(React.createElement('meta', { key: 'og-description', property: 'og:description', content: description }));
  if (absolute) nodes.push(React.createElement('meta', { key: 'og-url', property: 'og:url', content: absolute }));
  if (absolute) nodes.push(React.createElement('link', { key: 'canonical', rel: 'canonical', href: absolute }));
  if (ogType) nodes.push(React.createElement('meta', { key: 'og-type', property: 'og:type', content: ogType }));
  if (image) nodes.push(React.createElement('meta', { key: 'og-image', property: 'og:image', content: image }));
  if (twitterCard) nodes.push(React.createElement('meta', { key: 'twitter-card', name: 'twitter:card', content: twitterCard }));
  if (fullTitle) nodes.push(React.createElement('meta', { key: 'twitter-title', name: 'twitter:title', content: fullTitle }));
  if (description) nodes.push(React.createElement('meta', { key: 'twitter-description', name: 'twitter:description', content: description }));
  if (twitterImage) nodes.push(React.createElement('meta', { key: 'twitter-image', name: 'twitter:image', content: twitterImage }));

  return React.createElement(React.Fragment, null, nodes);
}

module.exports = {
  stylesheetHref,
  Stylesheet,
  DEFAULT_STYLESHEET_PATH,
  Meta,
};
