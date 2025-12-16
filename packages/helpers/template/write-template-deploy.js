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

function copyWorkflow(templateName, outRoot) {
  const root = resolveOutDir(outRoot);
  const outDir = path.join(root, '.github', 'workflows');
  ensureDir(outDir);
  const outPath = path.join(outDir, templateName);
  const templatePath = path.join(__dirname, templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing workflow template: ${templateName}`);
  }
  const yml = fs.readFileSync(templatePath, 'utf8');
  fs.writeFileSync(outPath, yml, 'utf8');
}

function main(outRoot) {
  const workflows = ['deploy-pages.yml', 'update-canopy-app.yml'];
  for (const workflow of workflows) {
    copyWorkflow(workflow, outRoot);
  }
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
