const fs = require('fs');
const path = require('path');
const {spawnSync, spawn} = require('child_process');

function parseArgs(argv = []) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    const key = token.replace(/^--?/, '');
    if (token === '--source' || token === '-s') {
      args.source = argv[i + 1];
      i += 1;
    } else if (token === '--out' || token === '-o') {
      args.out = argv[i + 1];
      i += 1;
    } else if (token === '--name' || token === '-n') {
      args.name = argv[i + 1];
      i += 1;
    } else if (key === 'help' || key === 'h') {
      args.help = true;
    }
  }
  return args;
}

function usage() {
  console.log('Usage: node packages/helpers/template/preview-template.js --source <dir> [--out <dir>] [--name <label>]');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    const cmd = [command].concat(args || []).join(' ');
    throw new Error(`Command failed: ${cmd}`);
  }
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
    return;
  }

  const cwd = process.cwd();
  const resolvedSource = path.resolve(cwd, args.source || 'packages/helpers/template');
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Template source not found: ${resolvedSource}`);
  }
  const templateName = args.name || path.basename(resolvedSource) || 'template-preview';
  const defaultOut = `.template-${templateName}-preview`;
  const resolvedOut = path.resolve(cwd, args.out || defaultOut);

  console.log(`[template preview] Preparing ${templateName} in ${resolvedOut}`);
  const env = {
    ...process.env,
    TEMPLATE_SOURCE_DIR: resolvedSource,
    TEMPLATE_OUT_DIR: resolvedOut,
  };

  run('node', ['packages/helpers/template/prepare-template.js'], {env});
  run(npmCommand(), ['install'], {cwd: resolvedOut});

  console.log('[template preview] Starting dev server (Ctrl+C to stop)...');
  const child = spawn(npmCommand(), ['run', 'dev'], {
    cwd: resolvedOut,
    stdio: 'inherit',
  });

  const handleSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    } else {
      process.exit(code || 0);
    }
  });
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}
