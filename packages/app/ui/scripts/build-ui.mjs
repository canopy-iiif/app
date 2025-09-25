#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import * as sass from 'sass';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const stylesDir = path.join(root, 'styles');
const indexScss = path.join(stylesDir, 'index.scss');
const indexCss = path.join(stylesDir, 'index.css');
const packageRoot = path.resolve(root, '..');
const packageName = '@canopy-iiif/app';

const externalizeWorkspaceLibComponents = {
  name: 'externalize-workspace-lib-components',
  setup(build) {
    build.onResolve({ filter: /\/lib\/components\// }, (args) => {
      try {
        const importerDir = path.dirname(args.importer);
        const absPath = path.resolve(importerDir, args.path);
        const relFromPackage = path.relative(packageRoot, absPath);
        if (!relFromPackage.startsWith('..')) {
          const packageImport = `${packageName}/${relFromPackage.split(path.sep).join('/')}`;
          return { path: packageImport, external: true };
        }
      } catch (_) {}
      // Fallback: keep original specifier but externalize so esbuild doesn't rebundle
      return { path: args.path, external: true };
    });
  }
};

async function compileStylesOnce() {
  try {
    const out = sass.compile(indexScss, { style: 'expanded' });
    fs.mkdirSync(path.dirname(indexCss), { recursive: true });
    fs.writeFileSync(indexCss, out.css || '', 'utf8');
    console.log('[ui] wrote', path.relative(root, indexCss));
  } catch (e) {
    console.warn('[ui] styles compile failed:', e && e.message ? e.message : e);
  }
}

async function run() {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch (e) {
    console.error('[ui] esbuild is not installed. Run `npm i -w @canopy-iiif/app`');
    process.exit(1);
  }

  const outdir = path.join(root, 'dist');
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(root, 'index.js')],
    outdir,
    entryNames: '[name]',
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    sourcemap: true,
    target: ['es2018'],
    external: ['react', 'react-dom', 'react-dom/client', 'react-masonry-css', 'flexsearch', 'cmdk', '@samvera/clover-iiif/*'],
    logLevel: 'info',
    outExtension: { '.js': '.mjs' },
    metafile: false
  }).then(() => null).catch((e) => {
    console.error('[ui] build failed:', e?.message || e);
    process.exit(1);
  });

  // Build SSR-safe server entry targeting Node (ESM bundle), keeping React and heavy browser libs external.
  await esbuild.build({
    entryPoints: [path.join(root, 'server.js')],
    outdir,
    entryNames: '[name]',
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: true,
    target: ['es2018'],
    external: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-masonry-css',
      'flexsearch',
      'cmdk',
      '@samvera/clover-iiif/*',
    ],
    mainFields: ['module', 'main'],
    conditions: ['module'],
    logLevel: 'info',
    outExtension: { '.js': '.mjs' },
    plugins: [externalizeWorkspaceLibComponents],
  }).catch((e) => {
    console.error('[ui] server build failed:', e?.message || e);
    process.exit(1);
  });

  // Build styles CSS once
  if (fs.existsSync(indexScss)) await compileStylesOnce();

  if (process.env.WATCH) {
    const context = await esbuild.context({
      entryPoints: [path.join(root, 'index.js')],
      outdir,
      entryNames: '[name]',
      bundle: true,
      platform: 'neutral',
      format: 'esm',
      sourcemap: true,
      target: ['es2018'],
      external: ['react', 'react-dom', 'react-dom/client', 'react-masonry-css', 'flexsearch', 'cmdk', '@samvera/clover-iiif/*'],
      logLevel: 'info',
      outExtension: { '.js': '.mjs' }
    });
    await context.watch();
    console.log('[ui] watching for changes...');

    // Watch server entry separately
    const serverCtx = await esbuild.context({
      entryPoints: [path.join(root, 'server.js')],
      outdir,
      entryNames: '[name]',
      bundle: true,
      platform: 'node',
      format: 'esm',
      sourcemap: true,
      target: ['es2018'],
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
        'react-masonry-css',
        'flexsearch',
        'cmdk',
        '@samvera/clover-iiif/*',
      ],
      mainFields: ['module', 'main'],
      conditions: ['module'],
      logLevel: 'info',
      outExtension: { '.js': '.mjs' },
      plugins: [externalizeWorkspaceLibComponents],
    });
    await serverCtx.watch();

    // Watch styles for changes and recompile styles/index.css
    try {
      if (fs.existsSync(indexScss)) {
        const srcDir = path.dirname(indexScss);
        fs.watch(srcDir, { recursive: true }, (evt, fn) => {
          try {
            // Only react to Sass source changes; ignore writes to generated index.css
            if (!fn) return;
            const changed = path.join(srcDir, fn);
            if (/\.s[ac]ss$/i.test(changed)) {
              compileStylesOnce();
            }
          } catch (_) {}
        });
      }
    } catch (_) {}
  }
}

run();
