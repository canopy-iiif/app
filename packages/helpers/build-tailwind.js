const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolveTailwindCli() {
  const localBin = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss'
  );
  if (fs.existsSync(localBin)) {
    return { cmd: localBin, args: [] };
  }
  return { cmd: 'tailwindcss', args: [] };
}

async function buildTailwind({ input, output, config, minify = true, watch = false } = {}) {
  if (!input || !output) {
    throw new Error('buildTailwind requires both input and output paths.');
  }
  const cli = resolveTailwindCli();
  const args = ['-i', input, '-o', output];
  if (config) args.push('-c', config);
  if (minify) args.push('--minify');
  if (watch) args.push('--watch');
  const res = spawnSync(cli.cmd, [...cli.args, ...args], { stdio: 'inherit' });
  if (!res || res.status !== 0) {
    throw new Error('Tailwind CLI exited with a non-zero status.');
  }
  return true;
}

module.exports = { buildTailwind };
function watchTailwind({ input, output, config, minify = false } = {}) {
  if (!input || !output) {
    throw new Error('watchTailwind requires both input and output paths.');
  }
  const cli = resolveTailwindCli();
  const args = ['-i', input, '-o', output, '--watch'];
  if (config) args.push('-c', config);
  if (minify) args.push('--minify');
  const child = spawn(cli.cmd, [...cli.args, ...args], { stdio: 'inherit' });
  return child;
}

module.exports.watchTailwind = watchTailwind;
