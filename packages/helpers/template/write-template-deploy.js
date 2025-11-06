const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function resolveOutDir(provided) {
  if (provided) return path.resolve(provided);
  const envDir = process.env.TEMPLATE_OUT_DIR;
  return path.resolve(process.cwd(), envDir || '.template-build');
}

function main(outRoot) {
  const root = resolveOutDir(outRoot);
  const outDir = path.join(root, '.github', 'workflows');
  ensureDir(outDir);
  const outPath = path.join(outDir, 'deploy-pages.yml');
  const templatePath = path.join(__dirname, 'deploy-pages.yml');
  const yml = fs.readFileSync(templatePath, 'utf8');
  fs.writeFileSync(outPath, yml, 'utf8');
}

module.exports = main;

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
