"use strict";
// Legacy shim: forward to the stable app entry verification
const { spawnSync } = require('child_process');
const res = spawnSync(process.execPath, ['app/scripts/canopy-build.mjs', '--verify'], { stdio: 'inherit' });
process.exit(res.status || 0);
