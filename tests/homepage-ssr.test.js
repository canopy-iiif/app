const path = require('node:path');
const { describe, it, expect, beforeEach } = require('@jest/globals');

function mockMdxModule() {
  return {
    extractTitle: () => 'Home',
    extractHeadings: () => [
      { id: 'about', depth: 1, title: 'About' },
      { id: 'highlighted-items', depth: 2, title: 'Highlighted Items' },
    ],
    ensureReactGlobals: async () => {},
    compileMdxFile: async () => ({
      head: '',
      body: [
        '<h2>Highlighted Items</h2>',
        '<div data-canopy-related-items="1"><script type="application/json">{}</script></div>'
      ].join(''),
    }),
  };
}

jest.mock('../packages/app/lib/build/mdx', () => mockMdxModule());

describe('Homepage SSR', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('renders RelatedItems placeholder and includes related slider scripts', async () => {
    const pages = require('../packages/app/lib/build/pages');
    const { OUT_DIR } = require('../packages/app/lib/common');
    const abs = path.resolve('content/index.mdx');
    const out = path.join(OUT_DIR, 'index.html');
    const html = await pages.renderContentMdxToHtml(abs, out, {});

    expect(typeof html).toBe('string');
    expect(html).toContain('Highlighted Items');
    expect(html).toMatch(/data-canopy-related-items/);
    expect(html).toMatch(/scripts\/canopy-related-items\.js/);
    expect(html).toMatch(/scripts\/canopy-slider\.js/);
  });
});
