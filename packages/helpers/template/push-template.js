const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd, opts) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function resolveOutDir() {
  const envDir = process.env.TEMPLATE_OUT_DIR;
  return path.resolve(process.cwd(), envDir || '.template-build');
}

function main() {
  const token = process.env.TEMPLATE_PUSH_TOKEN || '';
  const target = process.env.TARGET_REPO || '';
  if (!token) throw new Error('Missing TEMPLATE_PUSH_TOKEN');
  if (!target) throw new Error('Missing TARGET_REPO');
  const cwd = resolveOutDir();
  if (!fs.existsSync(cwd)) {
    throw new Error(`Template output directory not found: ${cwd}`);
  }
  run('git init -b main', { cwd });
  run('git config user.name "Mat Jordan"', { cwd });
  run('git config user.email "mat@northwestern.edu"', { cwd });
  run('git add .', { cwd });
  const commitMessage = process.env.TEMPLATE_COMMIT_MESSAGE || 'Update template from app/main';
  run('git commit -m "$TEMPLATE_COMMIT_MESSAGE"', {
    cwd,
    env: { ...process.env, TEMPLATE_COMMIT_MESSAGE: commitMessage },
  });
  run(
    `git remote add origin https://x-access-token:${token}@github.com/${target}.git`,
    { cwd }
  );
  run('git push --force origin main', { cwd });
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
