const { fs, fsp, path, ASSETS_DIR, OUT_DIR, ensureDirSync } = require('../common');
const { logLine } = require('./log');

async function copyAssets() {
  try {
    if (!fs.existsSync(ASSETS_DIR)) return;
  } catch (_) {
    return;
  }
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const src = path.join(dir, e.name);
      const rel = path.relative(ASSETS_DIR, src);
      const dest = path.join(OUT_DIR, rel);
      if (e.isDirectory()) { ensureDirSync(dest); await walk(src); }
      else if (e.isFile()) {
        ensureDirSync(path.dirname(dest));
        await fsp.copyFile(src, dest);
        try { logLine(`• Asset ${path.relative(process.cwd(), dest)}`, 'cyan', { dim: true }); } catch (_) {}
      }
    }
  }
  try { logLine('• Copying assets...', 'blue', { bright: true }); } catch (_) {}
  await walk(ASSETS_DIR);
  try { logLine('✓ Assets copied', 'green'); } catch (_) {}
}

module.exports = { copyAssets };

