const fs = require('fs');
const path = require('path');
const {
  CONTENT_DIR,
  rootRelativeHref,
  ensureDirSync,
} = require('../common');
const mdx = require('../build/mdx.js');
const {fromMarkdown} = require('mdast-util-from-markdown');
const {gfmFootnote} = require('micromark-extension-gfm-footnote');
const {gfmFootnoteFromMarkdown} = require('mdast-util-gfm-footnote');
const {toString} = require('mdast-util-to-string');
const {toHast} = require('mdast-util-to-hast');
const {toHtml} = require('hast-util-to-html');

const CACHE_FILE = path.resolve('.cache', 'bibliography.json');

let bibliographyEntries = null;
let bibliographyBuilt = false;

function isReservedContentFile(filePath) {
  if (mdx && typeof mdx.isReservedFile === 'function') {
    return mdx.isReservedFile(filePath);
  }
  const base = path.basename(filePath);
  return base.startsWith('_');
}

function normalizeHtmlFromChildren(children) {
  if (!Array.isArray(children) || !children.length) return '';
  const hast = toHast(
    {
      type: 'root',
      children,
    },
    {allowDangerousHtml: true}
  );
  try {
    return toHtml(hast, {allowDangerousHtml: true});
  } catch (_) {
    return '';
  }
}

function collectFootnotesFromSource(source) {
  if (!source) return [];
  const parsed = mdx.parseFrontmatter ? mdx.parseFrontmatter(source) : {content: source};
  const content = parsed && typeof parsed.content === 'string' ? parsed.content : '';
  if (!content.trim()) return [];
  const tree = fromMarkdown(content, {
    extensions: [gfmFootnote()],
    mdastExtensions: [gfmFootnoteFromMarkdown()],
  });
  const results = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'footnoteDefinition') {
      const identifier = node.identifier || node.label || String(results.length + 1);
      const text = toString(node).trim();
      const html = normalizeHtmlFromChildren(node.children || []);
      if (text || html) {
        results.push({
          identifier: String(identifier || results.length + 1),
          text,
          html,
        });
      }
      return;
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  };
  visit(tree);
  return results;
}

function readPageFootnotes(filePath) {
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return null;
  }
  const footnotes = collectFootnotesFromSource(raw);
  if (!footnotes.length) return null;
  const frontmatter = mdx.parseFrontmatter ? mdx.parseFrontmatter(raw) : {data: null};
  const data = frontmatter && frontmatter.data ? frontmatter.data : null;
  let title = '';
  if (data && typeof data.title === 'string' && data.title.trim()) {
    title = data.title.trim();
  } else if (typeof mdx.extractTitle === 'function') {
    title = mdx.extractTitle(raw);
  }
  const rel = path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
  const href = rootRelativeHref(rel.replace(/\.mdx$/i, '.html'));
  return {
    title,
    href,
    relativePath: rel,
    footnotes,
  };
}

function sortBibliography(entries) {
  return entries.sort((a, b) => {
    const titleA = (a && a.title) || '';
    const titleB = (b && b.title) || '';
    if (titleA && titleB) {
      const cmp = titleA.localeCompare(titleB);
      if (cmp !== 0) return cmp;
    }
    const hrefA = (a && a.href) || '';
    const hrefB = (b && b.href) || '';
    return hrefA.localeCompare(hrefB);
  });
}

function walkContentDir(dir, entries) {
  let dirents = [];
  try {
    dirents = fs.readdirSync(dir, {withFileTypes: true});
  } catch (_) {
    return;
  }
  for (const dirent of dirents) {
    if (!dirent) continue;
    const name = dirent.name || '';
    if (!name || name.startsWith('.')) continue;
    const absPath = path.join(dir, name);
    if (dirent.isDirectory()) {
      if (name.startsWith('_')) continue;
      walkContentDir(absPath, entries);
      continue;
    }
    if (!dirent.isFile() || !/\.mdx$/i.test(name)) continue;
    if (isReservedContentFile(absPath)) continue;
    const record = readPageFootnotes(absPath);
    if (record) entries.push(record);
  }
}

function writeCache(entries) {
  try {
    ensureDirSync(path.dirname(CACHE_FILE));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2), 'utf8');
  } catch (_) {}
}

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return null;
}

function buildBibliographyIndexSync() {
  if (!fs.existsSync(CONTENT_DIR)) {
    bibliographyEntries = [];
    bibliographyBuilt = true;
    return bibliographyEntries;
  }
  const entries = [];
  walkContentDir(CONTENT_DIR, entries);
  const sorted = sortBibliography(entries);
  bibliographyEntries = sorted;
  bibliographyBuilt = true;
  writeCache(sorted);
  return bibliographyEntries;
}

function getBibliographyEntries() {
  if (bibliographyBuilt && Array.isArray(bibliographyEntries)) {
    return bibliographyEntries;
  }
  const cached = readCache();
  if (cached) {
    bibliographyEntries = cached;
    bibliographyBuilt = true;
    return bibliographyEntries;
  }
  return buildBibliographyIndexSync();
}

function resetBibliographyIndex() {
  bibliographyEntries = null;
  bibliographyBuilt = false;
}

module.exports = {
  getBibliographyEntries,
  buildBibliographyIndexSync,
  resetBibliographyIndex,
};
