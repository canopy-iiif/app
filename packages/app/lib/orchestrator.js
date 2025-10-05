const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = (msg) => console.log(`[canopy] ${msg}`);
const warn = (msg) => console.warn(`[canopy][warn] ${msg}`);
const err = (msg) => console.error(`[canopy][error] ${msg}`);

let uiWatcherChild = null;

const workspacePackageJsonPath = path.resolve(process.cwd(), 'packages/app/package.json');
const hasAppWorkspace = fs.existsSync(workspacePackageJsonPath);

function getMode(argv = process.argv.slice(2), env = process.env) {
  const cli = new Set(argv);
  if (cli.has('--dev')) return 'dev';
  if (cli.has('--build')) return 'build';

  if (env.CANOPY_MODE === 'dev') return 'dev';
  if (env.CANOPY_MODE === 'build') return 'build';

  const npmScript = env.npm_lifecycle_event;
  if (npmScript === 'dev') return 'dev';
  if (npmScript === 'build') return 'build';

  return 'build';
}

function runOnce(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

function start(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  child.on('error', (error) => {
    const message = error && error.message ? error.message : String(error);
    warn(`Subprocess error (${cmd}): ${message}`);
  });
  return child;
}

async function prepareUi(mode, env = process.env) {
  if (!hasAppWorkspace) {
    log('Using bundled UI assets from @canopy-iiif/app (workspace not detected)');
    return null;
  }

  if (mode === 'build') {
    log('Building UI assets (@canopy-iiif/app/ui)');
    try {
      await runOnce('npm', ['-w', '@canopy-iiif/app', 'run', 'ui:build'], { env });
      log('UI assets built');
    } catch (error) {
      warn(`UI build skipped: ${(error && error.message) || String(error)}`);
    }
    return null;
  }

  try {
    log('Prebuilding UI assets (@canopy-iiif/app/ui)');
    await runOnce('npm', ['-w', '@canopy-iiif/app', 'run', 'ui:build'], { env });
  } catch (error) {
    warn(`UI prebuild skipped: ${(error && error.message) || String(error)}`);
  }

  log('Starting UI watcher (@canopy-iiif/app/ui)');
  try {
    uiWatcherChild = start('npm', ['-w', '@canopy-iiif/app', 'run', 'ui:watch'], { env });
  } catch (error) {
    warn(`UI watch skipped: ${(error && error.message) || String(error)}`);
    uiWatcherChild = null;
  }
  return uiWatcherChild;
}

function loadLibraryApi() {
  let lib;
  try {
    lib = require('./index.js');
  } catch (e) {
    const hint = [
      'Unable to load @canopy-iiif/app.',
      'Ensure dependencies are installed (npm install)',
      "and that peer deps like 'react' are present.",
    ].join(' ');
    const detail = e && e.message ? `\nCaused by: ${e.message}` : '';
    throw new Error(`${hint}${detail}`);
  }

  const api = lib && (typeof lib.build === 'function' || typeof lib.dev === 'function')
    ? lib
    : lib && lib.default
    ? lib.default
    : lib;

  if (!api || (typeof api.build !== 'function' && typeof api.dev !== 'function')) {
    throw new TypeError('Invalid @canopy-iiif/app export: expected functions build() and/or dev().');
  }

  return api;
}

function attachSignalHandlers() {
  const clean = () => {
    if (uiWatcherChild && !uiWatcherChild.killed) {
      try { uiWatcherChild.kill(); } catch (_) {}
    }
  };

  process.on('SIGINT', () => {
    clean();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    clean();
    process.exit(143);
  });
  process.on('exit', clean);
}

function verifyBuildOutput(outDir = 'site') {
  const root = path.resolve(outDir);
  function walk(dir) {
    let count = 0;
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) count += walk(p);
      else if (entry.isFile() && p.toLowerCase().endsWith('.html')) count += 1;
    }
    return count;
  }
  const pages = walk(root);
  if (!pages) {
    throw new Error('CI check failed: no HTML pages generated in "site/".');
  }
  log(`CI check: found ${pages} HTML page(s) in ${root}.`);
}

async function orchestrate(options = {}) {
  const argv = options.argv || process.argv.slice(2);
  const env = options.env || process.env;

  process.title = 'canopy-app';
  const mode = getMode(argv, env);
  log(`Mode: ${mode}`);

  const cli = new Set(argv);
  if (cli.has('--verify')) {
    verifyBuildOutput(env.CANOPY_OUT_DIR || 'site');
    return;
  }

  await prepareUi(mode, env);

  const api = loadLibraryApi();
  try {
    if (mode === 'dev') {
      attachSignalHandlers();
      log('Starting dev server...');
      await (typeof api.dev === 'function' ? api.dev() : Promise.resolve());
    } else {
      log('Building site...');
      if (typeof api.build === 'function') {
        await api.build();
      }
      log('Build complete');
      if (env.CANOPY_VERIFY === '1' || env.CANOPY_VERIFY === 'true') {
        verifyBuildOutput(env.CANOPY_OUT_DIR || 'site');
      }
    }
  } finally {
    if (uiWatcherChild && !uiWatcherChild.killed) {
      try { uiWatcherChild.kill(); } catch (_) {}
    }
  }
}

module.exports = {
  orchestrate,
  verifyBuildOutput,
  _internals: {
    getMode,
    prepareUi,
    loadLibraryApi,
    runOnce,
    start,
  },
  log,
  warn,
  err,
};
