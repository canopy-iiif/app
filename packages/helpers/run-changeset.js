#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (typeof res.status === 'number') process.exit(res.status);
  process.exit(1);
}

(function main() {
  const args = process.argv.slice(2);
  try {
    const cli = require.resolve('@changesets/cli/bin.js');
    run(process.execPath, [cli, ...args]);
  } catch (e) {
    // Fallback to npx to avoid requiring a local devDependency
    run('npx', ['-y', '@changesets/cli', ...args]);
  }
})();

