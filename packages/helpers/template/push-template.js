const { execSync } = require('child_process');

function run(cmd, opts) { execSync(cmd, { stdio: 'inherit', ...opts }); }

function main() {
  const token = process.env.TEMPLATE_PUSH_TOKEN || '';
  const target = process.env.TARGET_REPO || '';
  if (!token) throw new Error('Missing TEMPLATE_PUSH_TOKEN');
  if (!target) throw new Error('Missing TARGET_REPO');
  const cwd = 'dist-template';
  run('git init -b main', { cwd });
  run('git config user.name "Mat Jordan"', { cwd });
  run('git config user.email "mat@northwestern.edu"', { cwd });
  run('git add .', { cwd });
  run('git commit -m "Update template from app/main"', { cwd });
  run(`git remote add origin https://x-access-token:${token}@github.com/${target}.git`, { cwd });
  run('git push --force origin main', { cwd });
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message || e); process.exit(1); }
}

