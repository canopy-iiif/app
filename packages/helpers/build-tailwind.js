const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolveTailwindCli() {
  try {
    // Prefer JS entry to avoid shell indirection
    const cliJs = require.resolve('tailwindcss/lib/cli.js');
    return { cmd: process.execPath, args: [cliJs] };
  } catch (_) {}
  // Fallback to bin in node_modules/.bin
  const localBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
  if (fs.existsSync(localBin)) {
    return { cmd: localBin, args: [] };
  }
  return null;
}

async function buildTailwind({ input, output, config, minify = true, watch = false } = {}) {
  try {
    if (!input || !output) return false;
    const cli = resolveTailwindCli();
    if (!cli) return false;
    const args = ['-i', input, '-o', output];
    if (config) args.push('-c', config);
    if (minify) args.push('--minify');
    if (watch) args.push('--watch');
    const res = spawnSync(cli.cmd, [...cli.args, ...args], { stdio: 'inherit' });
    return res && res.status === 0;
  } catch (_) {
    return false;
  }
}

module.exports = { buildTailwind };
function watchTailwind({ input, output, config, minify = false } = {}) {
  try {
    if (!input || !output) return null;
    const cli = resolveTailwindCli();
    if (!cli) return null;
    const args = ['-i', input, '-o', output, '--watch'];
    if (config) args.push('-c', config);
    if (minify) args.push('--minify');
    const child = spawn(cli.cmd, [...cli.args, ...args], { stdio: 'inherit' });
    return child;
  } catch (_) {
    return null;
  }
}

module.exports.watchTailwind = watchTailwind;
