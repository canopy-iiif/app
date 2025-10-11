#!/usr/bin/env node
// Quick smoke test for built output
// - Fails if no HTML pages exist in OUT_DIR (default: site)
// - Fails if OUT_DIR/index.html is missing or empty
// - Prints a short summary and exits non-zero on failure

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(process.env.CANOPY_OUT_DIR || 'site');

function countHtml(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) count += countHtml(p);
    else if (e.isFile() && p.toLowerCase().endsWith('.html')) count++;
  }
  return count;
}

function fail(msg) {
  console.error(`✗ Verify: ${msg}`);
  process.exit(1);
}

try {
  const total = countHtml(OUT_DIR);
  if (!total) fail(`no HTML pages found in ${OUT_DIR}`);
  const indexPath = path.join(OUT_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) fail(`missing ${indexPath}`);
  const sz = fs.statSync(indexPath).size;
  if (!sz) fail(`${indexPath} is empty`);
  const html = fs.readFileSync(indexPath, 'utf8');
  const hasHero = /class=\"[^\"]*canopy-hero/.test(html) || /<div[^>]+canopy-hero/.test(html);
  const hasSearchForm = /data-canopy-search-form=/.test(html);
  if (!hasHero) fail('homepage missing Hero (class="canopy-hero")');
  if (!hasSearchForm) fail('homepage missing search form (data-canopy-search-form)');
  console.log(`✓ Verify: found ${total} HTML page(s); index.html OK; hero and search form present`);
  process.exit(0);
} catch (e) {
  fail(e && e.message ? e.message : String(e));
}
