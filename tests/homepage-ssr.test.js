const path = require('node:path');

// Mock the MDX build to avoid importing ESM in Jest and to focus on SSR wiring
jest.mock('../packages/app/lib/build/mdx', () => ({
  extractTitle: () => 'Home',
  ensureReactGlobals: async () => {},
  // Return HTML that includes the RelatedItems SSR placeholder
  compileMdxFile: async () => ({
    head: '',
    body: [
      '<h2>Highlighted Items</h2>',
      '<div data-canopy-related-items="1"><script type="application/json">{}</script></div>'
    ].join(''),
  }),
}));

describe('Homepage SSR', () => {
  it('renders RelatedItems placeholder and includes related slider scripts', async () => {
    const pages = require('../packages/app/lib/build/pages');
    const { OUT_DIR } = require('../packages/app/lib/common');
    const abs = path.resolve('content/index.mdx');
    const out = path.join(OUT_DIR, 'index.html');
    const html = await pages.renderContentMdxToHtml(abs, out, {});
    expect(typeof html).toBe('string');
    // Title and content from MDX
    expect(html).toContain('Highlighted Items');
    // SSR placeholder for RelatedItems
    expect(html).toMatch(/data-canopy-related-items/);
    // Ensure the related-items and slider runtimes are referenced
    expect(html).toMatch(/scripts\/canopy-related-items\.js/);
    expect(html).toMatch(/scripts\/canopy-slider\.js/);
  });
});
