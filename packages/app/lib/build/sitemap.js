const { fsp, path, OUT_DIR, absoluteUrl, rootRelativeHref } = require('../common');
const { logLine } = require('./log');

const DEFAULT_CHANGEFREQ = 'monthly';
const DEFAULT_PRIORITY = '0.5';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeHref(href) {
  if (!href && href !== 0) return '';
  const rel = rootRelativeHref(href);
  if (!rel || rel === '#') return '';
  if (rel.startsWith('?') || rel.startsWith('#')) return '';
  return rel;
}

function collectAbsoluteUrls(iiifRecords, pageRecords) {
  const urls = new Set();
  const push = (href) => {
    const rel = normalizeHref(href);
    if (!rel) return;
    try {
      const abs = absoluteUrl(rel);
      if (abs) urls.add(abs);
    } catch (_) {}
  };
  (Array.isArray(pageRecords) ? pageRecords : []).forEach((page) => {
    if (!page || !page.href) return;
    push(page.href);
  });
  (Array.isArray(iiifRecords) ? iiifRecords : []).forEach((record) => {
    if (!record || !record.href) return;
    push(record.href);
  });
  // Ensure the search page is always present even though it is generated separately
  push('/search.html');
  return Array.from(urls.values()).sort((a, b) => a.localeCompare(b));
}

async function writeSitemap(iiifRecords, pageRecords) {
  const urls = collectAbsoluteUrls(iiifRecords, pageRecords);
  if (!urls.length) {
    logLine('• No URLs to write to sitemap', 'yellow');
    return;
  }
  const rows = urls.map((loc) => {
    const escapedLoc = escapeXml(loc);
    return [
      '  <url>',
      `    <loc>${escapedLoc}</loc>`,
      `    <changefreq>${DEFAULT_CHANGEFREQ}</changefreq>`,
      `    <priority>${DEFAULT_PRIORITY}</priority>`,
      '  </url>',
    ].join('\n');
  });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    rows.join('\n'),
    '</urlset>',
    '',
  ].join('\n');
  const dest = path.join(OUT_DIR, 'sitemap.xml');
  await fsp.writeFile(dest, xml, 'utf8');
  logLine(`✓ Wrote sitemap.xml (${urls.length} urls)`, 'cyan');
}

module.exports = { writeSitemap };
