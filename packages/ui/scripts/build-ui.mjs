#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

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

  const ctx = await esbuild.build({
    entryPoints: [path.join(root, 'index.js')],
    outfile: path.join(outdir, 'index.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: true,
    target: ['node18'],
    external: ['react', 'react-dom', 'flexsearch', '@samvera/clover-iiif/*'],
    logLevel: 'info',
    metafile: false
  }).then(() => null).catch((e) => {
    console.error('[ui] build failed:', e?.message || e);
    process.exit(1);
  });

  if (process.env.WATCH) {
    const context = await esbuild.context({
      entryPoints: [path.join(root, 'index.js')],
      outfile: path.join(outdir, 'index.js'),
      bundle: true,
      platform: 'node',
      format: 'esm',
      sourcemap: true,
      target: ['node18'],
      external: ['react', 'react-dom', 'flexsearch', '@samvera/clover-iiif/*'],
      logLevel: 'info'
    });
    await context.watch();
    console.log('[ui] watching for changes...');
  }
}

run();
