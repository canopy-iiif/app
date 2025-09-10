#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const stylesDir = path.join(root, 'styles');
const indexScss = path.join(stylesDir, 'index.scss');
const indexCss = path.join(stylesDir, 'index.css');

function compileStylesOnce() {
  try {
    const sass = require('sass');
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
    console.error('[ui] esbuild is not installed. Run `npm i -w @canopy-iiif/ui`');
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
    external: ['react', 'react-dom', 'react-dom/client', 'react-masonry-css', 'flexsearch', '@samvera/clover-iiif/*'],
    logLevel: 'info',
    metafile: false
  }).then(() => null).catch((e) => {
    console.error('[ui] build failed:', e?.message || e);
    process.exit(1);
  });

  // Build SSR-safe server entry targeting Node
  await esbuild.build({
    entryPoints: [path.join(root, 'server.js')],
    outdir,
    entryNames: '[name]',
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: true,
    target: ['node18'],
    external: ['react', 'react-dom', '@samvera/clover-iiif/*'],
    logLevel: 'info',
  }).catch((e) => {
    console.error('[ui] server build failed:', e?.message || e);
    process.exit(1);
  });

  // Build styles CSS once
  if (fs.existsSync(indexScss)) compileStylesOnce();

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
      external: ['react', 'react-dom', 'react-dom/client', 'react-masonry-css', 'flexsearch', '@samvera/clover-iiif/*'],
      logLevel: 'info'
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
      target: ['node18'],
      external: ['react', 'react-dom', '@samvera/clover-iiif/*'],
      logLevel: 'info'
    });
    await serverCtx.watch();

    // Watch styles for changes and recompile styles/index.css
    try {
      if (fs.existsSync(indexScss)) {
        fs.watch(path.dirname(indexScss), { recursive: true }, (evt, fn) => {
          try { compileStylesOnce(); } catch (_) {}
        });
      }
    } catch (_) {}
  }
}

run();
