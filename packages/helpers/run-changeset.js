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
    const message = e && e.message ? e.message : e;
    console.error('[changesets] CLI not found in workspace. Install @changesets/cli as a dependency.');
    if (message) console.error('[changesets] Resolve error:', message);
    process.exit(1);
  }
})();
