const {
  parseFrontmatter,
  isRoadmapEntry,
  extractTitle,
  isReservedFile,
} = require('../../../packages/app/lib/build/mdx');

describe('parseFrontmatter', () => {
  it('parses YAML metadata with a BOM and leading whitespace', () => {
    const source = '\uFEFF\n\n---\ntitle: Intro\nsearch: true\n---\n# Body copy';
    const { data, content } = parseFrontmatter(source);

    expect(data).toEqual({ title: 'Intro', search: true });
    expect(content).toBe('# Body copy');
  });

  it('handles invalid YAML gracefully and preserves the source body', () => {
    const source = ['---', 'title: [draft', '---', 'Content body'].join('\n');
    const { data, content } = parseFrontmatter(source);

    expect(data).toBeNull();
    expect(content).toBe('Content body');
  });

  it('returns null metadata when no frontmatter block is present', () => {
    const source = '# Title only';
    const { data, content } = parseFrontmatter(source);

    expect(data).toBeNull();
    expect(content).toBe('# Title only');
  });
});

describe('isRoadmapEntry', () => {
  it('accepts boolean and numeric truthy values', () => {
    expect(isRoadmapEntry({ roadmap: true })).toBe(true);
    expect(isRoadmapEntry({ roadmap: 1 })).toBe(true);
  });

  it('normalizes string inputs regardless of case or whitespace', () => {
    expect(isRoadmapEntry({ roadmap: ' YES ' })).toBe(true);
    expect(isRoadmapEntry({ roadmap: 'no' })).toBe(false);
    expect(isRoadmapEntry({ roadmap: 'Off' })).toBe(false);
  });

  it('treats missing or falsy values as not being roadmap entries', () => {
    expect(isRoadmapEntry({})).toBe(false);
    expect(isRoadmapEntry(null)).toBe(false);
    expect(isRoadmapEntry({ roadmap: 0 })).toBe(false);
  });
});

describe('extractTitle', () => {
  it('prefers a title defined in frontmatter data', () => {
    const source = ['---', 'title: Custom Title', '---', '# Ignored Heading'].join('\n');
    expect(extractTitle(source)).toBe('Custom Title');
  });

  it('falls back to the first markdown heading when no title exists', () => {
    const source = ['## Primary Heading', '', 'Content body'].join('\n');
    expect(extractTitle(source)).toBe('Primary Heading');
  });

  it('returns "Untitled" when metadata and headings are missing', () => {
    expect(extractTitle('Plain paragraph')).toBe('Untitled');
  });
});

describe('isReservedFile', () => {
  it('treats files beginning with an underscore as reserved', () => {
    expect(isReservedFile('content/_layout.mdx')).toBe(true);
    expect(isReservedFile('content/docs/_overview.mdx')).toBe(true);
  });

  it('allows regular content files to pass through', () => {
    expect(isReservedFile('content/about.mdx')).toBe(false);
    expect(isReservedFile('content/guides/setup.mdx')).toBe(false);
  });
});
