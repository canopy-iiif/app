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
  const bin = path.resolve('node_modules/.bin/changeset');
  run(process.execPath, [bin, 'version']);
  console.log(`[version-bump] Applied ${bump} bump using ${path.basename(created)}`);
})();

