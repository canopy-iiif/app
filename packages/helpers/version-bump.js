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
    "'@canopy-iiif/app': " + bump,
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
  const runner = path.resolve('packages/helpers/run-changeset.js');
  run(process.execPath, [runner, 'version']);

  // Keep root app version in sync with fixed workspace packages
  try {
    const appPkgPath = path.resolve('packages/app/package.json');
    const newVersion = fs.existsSync(appPkgPath)
      ? JSON.parse(fs.readFileSync(appPkgPath, 'utf8')).version
      : null;
    if (!newVersion) throw new Error('Could not determine new version from app');

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
