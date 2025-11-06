const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUTPUT_ROOT = path.resolve(
  process.cwd(),
  process.env.TEMPLATE_OUT_DIR || '.template-build'
);

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
  ];
  const relativeOutput = path.relative(process.cwd(), OUTPUT_ROOT);
  if (relativeOutput && !relativeOutput.startsWith('..')) {
    excludes.push(relativeOutput);
  }
  const args = ['-a', '--delete'];
  for (const e of excludes) { args.push('--exclude', e); }
  const destArg = path.join(OUTPUT_ROOT, '');
  args.push('./', destArg.endsWith(path.sep) ? destArg : `${destArg}${path.sep}`);
  execFileSync('rsync', args, { stdio: 'inherit' });
}

function applyTemplateOverrides() {
  const distRoot = OUTPUT_ROOT;
  const templateRoot = __dirname;

  const templateContentDir = path.join(templateRoot, 'content');
  const distContentDir = path.join(distRoot, 'content');
  rmrf(distContentDir);
  mkdirp(distContentDir);
  if (fs.existsSync(templateContentDir) && fs.statSync(templateContentDir).isDirectory()) {
    copyDirContents(templateContentDir, distContentDir);
  }

  const templateAppPath = path.join(templateRoot, '_app.mdx');
  if (fs.existsSync(templateAppPath)) {
    const destAppPath = path.join(distRoot, 'content', '_app.mdx');
    mkdirp(path.dirname(destAppPath));
    fs.copyFileSync(templateAppPath, destAppPath);
  }

  const docsDir = path.join(distRoot, 'content', 'docs');
  rmrf(docsDir);

  const contributingPath = path.join(distRoot, 'CONTRIBUTING.md');
  rmrf(contributingPath);

  const tsconfigPath = path.join(distRoot, 'tsconfig.json');
  rmrf(tsconfigPath);

  const templateReadme = path.join(templateRoot, 'README.md');
  if (fs.existsSync(templateReadme)) {
    const destReadme = path.join(distRoot, 'README.md');
    fs.copyFileSync(templateReadme, destReadme);
  }
}

function rewritePackageJson(appVersion) {
  const p = path.join(OUTPUT_ROOT, 'package.json');
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
  const devDeps = {};
  const setDevDep = (name, fallback) => {
    const existing =
      (j.devDependencies && j.devDependencies[name]) ||
      (j.dependencies && j.dependencies[name]) ||
      null;
    if (existing) {
      devDeps[name] = existing;
    } else if (fallback) {
      devDeps[name] = fallback;
    }
  };

  setDevDep('@tailwindcss/cli', '^4.1.13');
  setDevDep('tailwindcss', '^4.1.13');
  setDevDep('tsx', '^4.19.1');

  const setDependency = (name, fallback) => {
    const existing =
      (j.dependencies && j.dependencies[name]) ||
      (j.devDependencies && j.devDependencies[name]) ||
      null;
    if (!j.dependencies) j.dependencies = {};
    if (existing) {
      j.dependencies[name] = existing;
    } else if (fallback) {
      j.dependencies[name] = fallback;
    }
    if (j.devDependencies) delete j.devDependencies[name];
  };

  setDependency('esbuild', '^0.21.4');

  const reactVersion =
    (j.dependencies && j.dependencies.react) ||
    (j.devDependencies && j.devDependencies.react) ||
    '^19.0.0';
  const reactDomVersion =
    (j.dependencies && j.dependencies['react-dom']) ||
    (j.devDependencies && j.devDependencies['react-dom']) ||
    '^19.0.0';

  if (!j.dependencies) j.dependencies = {};
  j.dependencies.react = reactVersion;
  j.dependencies['react-dom'] = reactDomVersion;

  delete j.devDependencies.react;
  delete j.devDependencies['react-dom'];

  j.devDependencies = devDeps;

  fs.writeFileSync(p, JSON.stringify(j, null, 2));
}

function writeTailwindFiles() {
  const stylesDir = path.join(OUTPUT_ROOT, 'app', 'styles');
  const srcStylesDir = path.join(process.cwd(), 'app', 'styles');
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

  const copiedConfig =
    copyIfExists('tailwind.config.mts') || copyIfExists('tailwind.config.ts');
  const copiedCss = copyIfExists('index.css');

  if (!copiedConfig) {
    const fallbackCfg = `import { createRequire } from 'node:module';
import type { Config } from 'tailwindcss';

const require = createRequire(import.meta.url);

const config: Config = {
  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],
  content: [require.resolve('@canopy-iiif/app/ui')],
  plugins: [require('@canopy-iiif/app/ui/canopy-iiif-plugin')],
};

export default config;
`;
    fs.writeFileSync(path.join(stylesDir, 'tailwind.config.mts'), fallbackCfg, 'utf8');
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
  rmrf(OUTPUT_ROOT);
  mkdirp(OUTPUT_ROOT);
  copyRepoToTemplate();
  applyTemplateOverrides();
  rewritePackageJson(appVersion);
  const writeTemplateDeploy = require('./write-template-deploy');
  writeTemplateDeploy(OUTPUT_ROOT);
  writeTailwindFiles();
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
