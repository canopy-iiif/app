const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) {}
}
function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
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
  const args = ['-a', '--delete'];
  for (const e of excludes) { args.push('--exclude', e); }
  args.push('./', 'dist-template/');
  execFileSync('rsync', args, { stdio: 'inherit' });
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
  mkdirp(stylesDir);
  const tp = path.join(stylesDir, 'tailwind.config.js');
  const cssp = path.join(stylesDir, 'index.css');
  const tw = `// Default Canopy UI enabled. Remove lines below to disable.
module.exports = {
  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],
  content: [
    './content/**/*.{mdx,html}',
    './site/**/*.html',
    './site/**/*.js',
    './packages/app/ui/**/*.{js,jsx,ts,tsx}',
    './packages/app/lib/iiif/components/**/*.{js,jsx}',
  ],
  theme: { extend: {} },
  corePlugins: {
    // preflight: false, // uncomment to disable base reset
  },
  plugins: [require('@canopy-iiif/app/ui/canopy-iiif-plugin')],
  safelist: [
    // Add dynamic classes here if needed
  ],
};
`;
  const css = `@source "../content/**/*.{mdx,html}";
@source "../site/**/*.html";
@source "../packages/app/ui/**/*.{js,jsx,ts,tsx}";
@source "../packages/app/lib/iiif/components/**/*.{js,jsx}";

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Example component layer overrides */
@layer components {
  .brand-link { @apply text-brand hover:underline font-semibold; }
}
`;
  fs.writeFileSync(tp, tw, 'utf8');
  fs.writeFileSync(cssp, css, 'utf8');
}

function main() {
  const appVersion = process.env.APP_VERSION || '';
  rmrf('dist-template');
  mkdirp('dist-template');
  copyRepoToTemplate();
  rewritePackageJson(appVersion);
  const writeTemplateDeploy = require('./write-template-deploy');
  writeTemplateDeploy();
  writeTailwindFiles();
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
