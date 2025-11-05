const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) {}
}
function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDirContents(src, dest) {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  mkdirp(dest);
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirContents(srcPath, destPath);
      continue;
    }
    if (entry.isFile()) {
      mkdirp(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyRepoToTemplate() {
  const excludes = [
    '.git',
    'node_modules',
    'AGENTS.md',
    'tests',
    '.husky',
    'configs',
    'packages',
    '.cache',
    '.changeset',
    '.github/workflows/template.yml',
    '.github/workflows/retarget-pr-base.yml',
    '.github/workflows/release-and-template.yml',
    '.github/workflows/test.yml',
    'dist-template',
  ];
  const args = ['-a', '--delete'];
  for (const e of excludes) { args.push('--exclude', e); }
  args.push('./', 'dist-template/');
  execFileSync('rsync', args, { stdio: 'inherit' });
}

function applyTemplateOverrides() {
  const distRoot = path.join('dist-template');
  const templateRoot = __dirname;

  const templateAppPath = path.join(templateRoot, '_app.mdx');
  if (fs.existsSync(templateAppPath)) {
    const destAppPath = path.join(distRoot, 'content', '_app.mdx');
    mkdirp(path.dirname(destAppPath));
    fs.copyFileSync(templateAppPath, destAppPath);
  }

  const docsDir = path.join(distRoot, 'content', 'docs');
  rmrf(docsDir);

  const templateContentDir = path.join(templateRoot, 'content');
  if (fs.existsSync(templateContentDir)) {
    copyDirContents(templateContentDir, path.join(distRoot, 'content'));
  }
}

function rewritePackageJson(appVersion) {
  const p = path.join('dist-template', 'package.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const vApp = appVersion || '';
  if (j.dependencies) {
    if (j.dependencies['@canopy-iiif/app']) {
      j.dependencies['@canopy-iiif/app'] = vApp ? ('^' + vApp) : '*';
    }
    for (const k of Object.keys(j.dependencies)) {
      if (j.dependencies[k] === 'workspace:*') j.dependencies[k] = '*';
    }
  }
  if (j.workspaces) delete j.workspaces;
  j.scripts = {
    build: 'tsx app/scripts/canopy-build.mts',
    dev: 'tsx app/scripts/canopy-build.mts',
  };
  j.devDependencies = j.devDependencies || {};
  delete j.devDependencies['@changesets/cli'];
  delete j.devDependencies.jest;
  delete j.devDependencies['@playwright/test'];
  delete j.devDependencies.husky;
  delete j.devDependencies.eslint;
  delete j.devDependencies['eslint-config-prettier'];
  delete j.devDependencies['eslint-import-resolver-typescript'];
  delete j.devDependencies['eslint-plugin-import'];
  delete j.devDependencies['eslint-plugin-react'];
  delete j.devDependencies['eslint-plugin-react-hooks'];
  delete j.devDependencies.prettier;
  delete j.devDependencies['@typescript-eslint/eslint-plugin'];
  delete j.devDependencies['@typescript-eslint/parser'];
  delete j.devDependencies['typescript-eslint'];
  j.devDependencies.tsx = j.devDependencies.tsx || '^4.19.1';
  j.devDependencies.typescript = j.devDependencies.typescript || '^5.9.3';
  j.devDependencies['@types/node'] = j.devDependencies['@types/node'] || '^24.6.2';
  j.devDependencies.tailwindcss = j.devDependencies.tailwindcss || '^4.1.13';
  // No longer include @tailwindcss/typography by default
  fs.writeFileSync(p, JSON.stringify(j, null, 2));
}

function writeTailwindFiles() {
  const stylesDir = path.join('dist-template', 'app', 'styles');
  const srcStylesDir = path.join(__dirname, '..', '..', '..', 'app', 'styles');
  mkdirp(stylesDir);

  function copyIfExists(filename) {
    const src = path.join(srcStylesDir, filename);
    const dest = path.join(stylesDir, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      return true;
    }
    return false;
  }

  const copiedConfig = copyIfExists('tailwind.config.js');
  const copiedCss = copyIfExists('index.css');

  if (!copiedConfig) {
    const fallbackCfg = `module.exports = {
  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],
  content: [
    require.resolve('@canopy-iiif/app/ui'),
  ],
  plugins: [require('@canopy-iiif/app/ui/canopy-iiif-plugin')],
};
`;
    fs.writeFileSync(path.join(stylesDir, 'tailwind.config.js'), fallbackCfg, 'utf8');
  }

  if (!copiedCss) {
    const fallbackCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
    fs.writeFileSync(path.join(stylesDir, 'index.css'), fallbackCss, 'utf8');
  }
}

function main() {
  const appVersion = process.env.APP_VERSION || '';
  rmrf('dist-template');
  mkdirp('dist-template');
  copyRepoToTemplate();
  applyTemplateOverrides();
  rewritePackageJson(appVersion);
  const writeTemplateDeploy = require('./write-template-deploy');
  writeTemplateDeploy();
  writeTailwindFiles();
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
