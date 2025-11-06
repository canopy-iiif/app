import path from 'node:path';
import type { Config } from 'tailwindcss';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toGlob = (...parts: string[]): string =>
  path.join(...parts).replace(/\\/g, '/');

const projectRoot = path.join(__dirname, '..', '..');
const canopyUiDist = path.dirname(require.resolve('@canopy-iiif/app/ui'));
const canopyLibRoot = path.dirname(require.resolve('@canopy-iiif/app'));

const config: Config = {
  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],
  plugins: [require('@canopy-iiif/app/ui/canopy-iiif-plugin')],
  content: [
    toGlob(projectRoot, 'content/**/*.{mdx,html}'),
    toGlob(projectRoot, 'app/**/*.{js,ts,jsx,tsx}'),
    toGlob(canopyUiDist, '**/*.{js,mjs,jsx,tsx}'),
    toGlob(canopyLibRoot, 'iiif/components/**/*.{js,jsx}'),
  ],
  theme: {
    extend: {
      // Example: tweak brand or gray ramps if the values in canopy.yml
      // aren’t sufficient for fine-grained control.
      // colors: {
      //   brand: {
      //     500: '#4f46e5',
      //     700: '#4338ca',
      //   },
      //   gray: {
      //     900: '#0f172a',
      //     100: '#f8fafc',
      //   },
      // },
    },
  },
  safelist: ['canopy-footer', 'canopy-footer__inner'],
};

export default config;
