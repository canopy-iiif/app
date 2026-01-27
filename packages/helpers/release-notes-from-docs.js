'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function loadReleases() {
  const modulePath = path.resolve('content', 'docs', 'releases', 'releases.data.mjs');
  if (!fs.existsSync(modulePath)) {
    throw new Error(`Release data file not found at ${modulePath}`);
  }
  const mod = await import(pathToFileURL(modulePath).href);
  const releases = mod && (mod.default || mod.releases);
  if (!Array.isArray(releases)) {
    throw new Error('Release data module did not export an array.');
  }
  return releases;
}

function formatBody(entry) {
  const blocks = [];
  if (entry.summary) blocks.push(entry.summary.trim());
  if (Array.isArray(entry.highlights) && entry.highlights.length) {
    const list = entry.highlights
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join('\n');
    if (list) blocks.push(list);
  }
  return blocks.join('\n\n').trim();
}

async function main() {
  const version = process.argv[2];
  if (!version) {
    throw new Error('Usage: node packages/helpers/release-notes-from-docs.js <version>');
  }
  const releases = await loadReleases();
  const entry = releases.find((item) => item && item.version === version);
  if (!entry) {
    throw new Error(`Release entry for version ${version} not found in releases.data.mjs`);
  }
  const payload = {
    version: entry.version,
    date: entry.date || '',
    summary: entry.summary || '',
    highlights: Array.isArray(entry.highlights) ? entry.highlights.filter(Boolean) : [],
    body: formatBody(entry),
  };
  process.stdout.write(JSON.stringify(payload));
}

main().catch((err) => {
  console.error('[release-notes-from-docs]', err && err.message ? err.message : err);
  process.exit(1);
});
