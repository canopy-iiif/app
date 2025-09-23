const { fs, path, OUT_DIR } = require('../common');
const { logLine } = require('./log');

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return ''; }
}

function hasHtmlFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) count += hasHtmlFiles(p);
    else if (e.isFile() && p.toLowerCase().endsWith('.html')) count++;
  }
  return count;
}

function verifyHomepageElements(outDir) {
  const idx = path.join(outDir, 'index.html');
  const html = readFileSafe(idx);
  const okHero = /class=\"[^\"]*canopy-hero/.test(html) || /<div[^>]+canopy-hero/.test(html);
  const okCommand = /data-canopy-command=/.test(html);
  const okCommandTrigger = /data-canopy-command-trigger/.test(html);
  const okCommandScriptRef = /<script[^>]+canopy-command\.js/.test(html);
  return { okHero, okCommand, okCommandTrigger, okCommandScriptRef, htmlPath: idx };
}

function verifyBuildOutput(options = {}) {
  const outDir = path.resolve(options.outDir || OUT_DIR);
  logLine("\nVerify build output", "magenta", { bright: true, underscore: true });
  const total = hasHtmlFiles(outDir);
  const okAny = total > 0;
  const indexPath = path.join(outDir, 'index.html');
  const hasIndex = fs.existsSync(indexPath) && fs.statSync(indexPath).size > 0;
  const { okHero, okCommand, okCommandTrigger, okCommandScriptRef } = verifyHomepageElements(outDir);

  const ck = (label, ok, extra) => {
    const status = ok ? '✓' : '✗';
    logLine(`${status} ${label}${extra ? ` ${extra}` : ''}`, ok ? 'green' : 'red');
  };

  ck('HTML pages exist', okAny, okAny ? `(${total})` : '');
  ck('homepage exists', hasIndex, hasIndex ? `(${indexPath})` : '');
  ck('homepage: Hero present', okHero);
  ck('homepage: Command present', okCommand);
  ck('homepage: Command trigger present', okCommandTrigger);
  ck('homepage: Command script referenced', okCommandScriptRef);

  // Do not fail build on missing SSR trigger; the client runtime injects a default.
  const ok = okAny && hasIndex && okHero && okCommand && okCommandScriptRef;
  if (!ok) {
    const err = new Error('Build verification failed');
    err.outDir = outDir;
    throw err;
  }
}

module.exports = { verifyBuildOutput };
