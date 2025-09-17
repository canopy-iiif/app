const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function main() {
  const outDir = path.join('dist-template', '.github', 'workflows');
  ensureDir(outDir);
  const outPath = path.join(outDir, 'deploy-pages.yml');
  const templatePath = path.join(__dirname, 'deploy-pages.yml');
  const yml = fs.readFileSync(templatePath, 'utf8');
  fs.writeFileSync(outPath, yml, 'utf8');
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

