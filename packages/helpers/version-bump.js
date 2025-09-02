'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  if (args.has('--major')) return 'major';
  if (args.has('--minor') || args.has('-m')) return 'minor';
  return 'patch';
}

function writeChangeset(bump) {
  const dir = path.resolve('.changeset');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.TZ-]/g, '').slice(0, 14);
  const name = `bump-${bump}-${ts}.md`;
  const file = path.join(dir, name);
  const header = [
    '---',
    "'@canopy-iiif/lib': " + bump,
    "'@canopy-iiif/ui': " + bump,
    '---',
    '',
    `chore: version bump (${bump}) via helper script.`,
    '',
  ].join('\n');
  fs.writeFileSync(file, header, 'utf8');
  return file;
}

function run(cmd, args, opts) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (res.status !== 0) process.exit(res.status || 1);
}

(function main() {
  const bump = parseArgs(process.argv);
  const created = writeChangeset(bump);
  // Apply versioning based on pending changesets (including the one we just wrote)
  // Use the JS entry directly to avoid shell shim incompatibilities
  let cli;
  try {
    cli = require.resolve('@changesets/cli/bin.js');
  } catch (e) {
    console.error('[version-bump] @changesets/cli not found. Install it as a devDependency.');
    process.exit(1);
  }
  run(process.execPath, [cli, 'version']);

  // Keep root app version in sync with fixed workspace packages
  try {
    const libPkgPath = path.resolve('packages/lib/package.json');
    const uiPkgPath = path.resolve('packages/ui/package.json');
    const libVersion = fs.existsSync(libPkgPath)
      ? JSON.parse(fs.readFileSync(libPkgPath, 'utf8')).version
      : null;
    const uiVersion = fs.existsSync(uiPkgPath)
      ? JSON.parse(fs.readFileSync(uiPkgPath, 'utf8')).version
      : null;
    const newVersion = libVersion || uiVersion;
    if (!newVersion) throw new Error('Could not determine new version from lib/ui');

    const rootPkgPath = path.resolve('package.json');
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    const prev = rootPkg.version;
    if (prev !== newVersion) {
      rootPkg.version = newVersion;
      fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
      console.log(`[version-bump] Synced root version ${prev} -> ${newVersion}`);
    } else {
      console.log('[version-bump] Root version already matches', newVersion);
    }
  } catch (e) {
    console.warn('[version-bump] Warning syncing root version:', e.message);
  }

  console.log(`[version-bump] Applied ${bump} bump using ${path.basename(created)}`);
})();
