import path from 'path';
import plugin from 'tailwindcss/plugin';
import type { Config } from 'tailwindcss';
import { loadCanopyTheme } from '@canopy-iiif/app/ui/theme';

if (process.env.CANOPY_DEBUG_THEME) {
  console.log('[tailwind-config] loaded');
}

const toGlob = (...parts: string[]): string =>
  path.join(...parts).replace(/\\/g, '/');

const projectRoot = path.join(__dirname, '..', '..');
const canopyUiDist = path.dirname(require.resolve('@canopy-iiif/app/ui'));
const canopyUiRoot = path.dirname(canopyUiDist);
const canopyLibRoot = path.dirname(require.resolve('@canopy-iiif/app'));

function compileCanopyTokens(): string {
  const theme = loadCanopyTheme();
  if (theme && theme.css) return theme.css;

  try {
    const sass: typeof import('sass') = require('sass');
    const entry = path.join(canopyUiRoot, 'styles', 'variables.emit.scss');
    const result = sass.compile(entry, { style: 'expanded' });
    return result && result.css ? result.css : '';
  } catch {
    return '';
  }
}

const canopyTokensCss = compileCanopyTokens();

const tailwindConfig = {
  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],
  content: [
    toGlob(projectRoot, 'content/**/*.{mdx,html}'),
    toGlob(canopyUiDist, '**/*.{js,mjs,jsx,tsx}'),
    toGlob(canopyLibRoot, 'iiif/components/**/*.{js,jsx}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@canopy-iiif/app/ui/canopy-iiif-plugin'),
    plugin(({ addBase }) => {
      if (!canopyTokensCss || !canopyTokensCss.trim()) {
        return;
      }
      if (process.env.CANOPY_DEBUG_THEME) {
        console.log('[tailwind-config] injecting theme tokens');
      }
      const postcss: typeof import('postcss') = require('postcss');
      addBase(postcss.parse(canopyTokensCss) as unknown as any);
    }),
  ],
  safelist: ['canopy-footer', 'canopy-footer__inner'],
};

export default tailwindConfig as Config;
