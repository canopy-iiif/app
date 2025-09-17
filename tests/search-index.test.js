// Unit test for buildSearchIndex combining IIIF and MDX page records
jest.mock('../packages/app/lib/search/search', () => ({
  writeSearchIndex: jest.fn(async () => {}),
}));

const { buildSearchIndex } = require('../packages/app/lib/build/search-index');

describe('buildSearchIndex()', () => {
  it('combines iiif and mdx page records and writes the index', async () => {
    const iiif = [
      { id: '1', title: 'Work A', href: 'works/a.html', type: 'work' },
    ];
    const pages = [
      { title: 'Page A', href: 'a.html', searchInclude: true, searchType: 'page' },
      { title: 'Hidden', href: 'x.html', searchInclude: false, searchType: 'page' },
    ];

    const combined = await buildSearchIndex(iiif, pages);

    // Includes Work A and Page A, excludes Hidden
    expect(combined).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Work A', type: 'work' }),
        expect.objectContaining({ title: 'Page A', type: 'page' }),
      ]),
    );
    expect(combined.find((r) => r.title === 'Hidden')).toBeUndefined();

    const search = require('../packages/app/lib/search/search');
    expect(search.writeSearchIndex).toHaveBeenCalledWith(combined);
  });
});

