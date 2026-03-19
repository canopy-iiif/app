const path = require('path');
const {CONTENT_DIR} = require('../lib/common');

const IMPORT_FROM_RE = /^import\s+([\s\S]+?)\s+from\s+['"]([^\n'";]+)['"];?$/gm;
const IMPORT_SIDE_EFFECT_RE = /^import\s+['"]([^\n'";]+)['"];?$/gm;

function normalizeSlashes(value) {
  return value ? value.replace(/\\/g, '/') : value;
}

function resolveImportKey(specifier, sourcePath) {
  if (!specifier) return '';
  if (!sourcePath) return specifier;
  if (!specifier.startsWith('.')) return specifier;
  try {
    const absSource = path.join(CONTENT_DIR, sourcePath);
    const absDir = path.dirname(absSource);
    const absImport = path.resolve(absDir, specifier);
    const relToRoot = path.relative(process.cwd(), absImport);
    return normalizeSlashes(relToRoot);
  } catch (_) {
    return specifier;
  }
}

function resolveImportPath(specifier, sourcePath) {
  if (!specifier) return '';
  if (!specifier.startsWith('.')) return specifier;
  try {
    const absSource = path.join(CONTENT_DIR, sourcePath);
    const absDir = path.dirname(absSource);
    return path.resolve(absDir, specifier);
  } catch (_) {
    return specifier;
  }
}

function parseNamedImports(block) {
  const inner = block.replace(/[{}]/g, '').trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const segments = part.split(/\s+as\s+/i);
      if (segments.length === 2) {
        return {type: 'named', imported: segments[0].trim(), local: segments[1].trim()};
      }
      return {type: 'named', imported: segments[0].trim(), local: segments[0].trim()};
    })
    .filter((item) => item.imported && item.local);
}

function parseClause(clause) {
  const members = [];
  if (!clause) return members;
  let working = clause.trim();
  if (!working) return members;
  const namespaceMatch = working.match(/\*\s+as\s+([A-Za-z0-9_$]+)/);
  if (namespaceMatch) {
    members.push({type: 'namespace', local: namespaceMatch[1]});
    working = working.replace(namespaceMatch[0], '').trim();
  }
  const namedMatch = working.match(/\{[^}]+\}/);
  if (namedMatch) {
    members.push(...parseNamedImports(namedMatch[0]));
    working = working.replace(namedMatch[0], '').trim();
  }
  const defaultMatch = working.replace(/,/g, ' ').trim();
  if (defaultMatch) {
    const local = defaultMatch.split(/\s+/)[0].trim();
    if (local) members.push({type: 'default', local});
  }
  return members;
}

function parseMdxImports(source, sourcePath) {
  const seen = new Set();
  const imports = [];
  if (!source) return {imports};
  const src = String(source);
  for (const match of src.matchAll(IMPORT_FROM_RE)) {
    const clause = match[1];
    const specifier = match[2];
    if (!specifier) continue;
    const key = `${specifier}__${match.index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const members = parseClause(clause);
    imports.push({
      specifier,
      resolvedKey: resolveImportKey(specifier, sourcePath),
      importPath: resolveImportPath(specifier, sourcePath),
      members,
      type: 'from',
      raw: match[0],
    });
  }
  for (const match of src.matchAll(IMPORT_SIDE_EFFECT_RE)) {
    if (/from\s+/i.test(match[0])) continue;
    const specifier = match[1];
    if (!specifier) continue;
    const key = `${specifier}__side_${match.index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    imports.push({
      specifier,
      resolvedKey: resolveImportKey(specifier, sourcePath),
      importPath: resolveImportPath(specifier, sourcePath),
      members: [],
      type: 'side-effect',
      raw: match[0],
    });
  }
  return {imports};
}

module.exports = {
  parseMdxImports,
  resolveImportKey,
  resolveImportPath,
};
