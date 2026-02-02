const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(command, options = {}) {
  execSync(command, { stdio: 'inherit', ...options });
}

function resolveOutDir() {
  const custom = process.env.ORG_SITE_OUT_DIR;
  return path.resolve(process.cwd(), custom || '.org-build');
}

function main() {
  const token = process.env.ORG_SITE_PUSH_TOKEN || '';
  const targetRepo = process.env.ORG_SITE_TARGET_REPO || '';
  const targetBranch = process.env.ORG_SITE_TARGET_BRANCH || 'main';
  const commitMessage =
    process.env.ORG_SITE_COMMIT_MESSAGE || 'Update canopy-iiif.github.io from app/main';
  const gitName = process.env.ORG_SITE_GIT_AUTHOR_NAME || 'Mat Jordan';
  const gitEmail = process.env.ORG_SITE_GIT_AUTHOR_EMAIL || 'mat@northwestern.edu';

  if (!token) throw new Error('Missing ORG_SITE_PUSH_TOKEN');
  if (!targetRepo) throw new Error('Missing ORG_SITE_TARGET_REPO');

  const cwd = resolveOutDir();
  if (!fs.existsSync(cwd)) {
    throw new Error(`Org site output directory not found: ${cwd}`);
  }

  run(`git init -b ${targetBranch}`, { cwd });
  run(`git config user.name "${gitName}"`, { cwd });
  run(`git config user.email "${gitEmail}"`, { cwd });
  run('git add .', { cwd });
  run('git commit -m "$ORG_SITE_COMMIT_MESSAGE"', {
    cwd,
    env: { ...process.env, ORG_SITE_COMMIT_MESSAGE: commitMessage },
  });
  const remoteUrl = `https://x-access-token:${token}@github.com/${targetRepo}.git`;
  run(`git remote add origin ${remoteUrl}`, { cwd });
  run(`git push --force origin ${targetBranch}`, { cwd });
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}
