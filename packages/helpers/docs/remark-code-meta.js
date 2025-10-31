function visit(node, visitor) {
  if (!node || typeof node !== 'object') return;
  if (visitor(node) === false) return;
  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      visit(child, visitor);
    }
  }
}

function parseHighlight(input) {
  if (!input) return [];
  const cleaned = String(input || '').trim();
  if (!cleaned) return [];
  const segments = cleaned.split(',').map((seg) => seg.trim()).filter(Boolean);
  const lines = new Set();
  for (const segment of segments) {
    if (!segment) continue;
    if (/^\d+-\d+$/.test(segment)) {
      const [startRaw, endRaw] = segment.split('-');
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        for (let i = start; i <= end; i += 1) {
          lines.add(i);
        }
      }
    } else if (/^\d+$/.test(segment)) {
      const value = Number(segment);
      if (Number.isFinite(value)) lines.add(value);
    }
  }
  return Array.from(lines).sort((a, b) => a - b);
}

function parseMeta(metaString) {
  if (!metaString) return null;
  let working = String(metaString || '').trim();
  if (!working) return null;
  const highlightMatches = [];
  working = working.replace(/\{([^}]+)\}/g, (match, inner) => {
    highlightMatches.push(inner);
    return ' ';
  });
  const highlightLines = highlightMatches
    .map((segment) => parseHighlight(segment))
    .reduce((acc, arr) => acc.concat(arr), []);
  const tokens = working.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const meta = {
    copy: false,
    filename: '',
    highlights: highlightLines,
  };
  for (const tokenRaw of tokens) {
    const token = tokenRaw.trim();
    if (!token) continue;
    if (token === 'copy') {
      meta.copy = true;
      continue;
    }
    if (/^[A-Za-z0-9_-]+=/.test(token)) {
      const eqIndex = token.indexOf('=');
      const key = token.slice(0, eqIndex);
      let value = token.slice(eqIndex + 1);
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key === 'filename') {
        meta.filename = value;
      } else if (key === 'copy') {
        meta.copy = value === '' || /^(1|true|yes|on)$/i.test(value);
      }
    }
  }
  return meta;
}

module.exports = function remarkCodeMeta() {
  return (tree) => {
    visit(tree, (node) => {
      if (!node || node.type !== 'code') return;
      const metaSource = node.meta || (node.data && node.data.metastring);
      if (!metaSource) return;
      const parsed = parseMeta(metaSource);
      if (!parsed) return;
      node.data = node.data || {};
      node.data.hProperties = Object.assign({}, node.data.hProperties);
      if (parsed.filename) {
        node.data.hProperties['data-filename'] = parsed.filename;
      }
      if (parsed.copy) {
        node.data.hProperties['data-copy'] = 'true';
      }
      if (parsed.highlights && parsed.highlights.length) {
        node.data.hProperties['data-highlight'] = parsed.highlights.join(',');
      }
    });
  };
};

module.exports.parseMeta = parseMeta;
module.exports.parseHighlight = parseHighlight;
