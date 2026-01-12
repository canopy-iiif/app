const iiif = require('../../../packages/app/lib/build/iiif');

const {
  resolvePositiveInteger,
  formatDurationMs,
  resolveBoolean,
  normalizeCollectionUris,
  clampSlugLength,
  isSlugTooLong,
  normalizeSlugBase,
  buildSlugWithSuffix,
  normalizeStringList,
  ensureThumbnailValue,
  extractSummaryValues,
  truncateSummary,
  extractMetadataValues,
  extractAnnotationText,
  normalizeIiifId,
  normalizeIiifType,
  resolveParentFromPartOf,
  computeUniqueSlug,
  ensureBaseSlugFor,
  resetReservedSlugs,
} = iiif.__TESTING__;

describe('resolvePositiveInteger', () => {
  it('coerces strings and clamps to at least 1', () => {
    expect(resolvePositiveInteger('5.8', 2)).toBe(5);
    expect(resolvePositiveInteger('-4', 3)).toBe(3);
  });

  it('can return zero when allowZero is enabled', () => {
    expect(resolvePositiveInteger('0', 5, { allowZero: true })).toBe(0);
    expect(resolvePositiveInteger(undefined, 0, { allowZero: true })).toBe(0);
  });
});

describe('formatDurationMs', () => {
  it('renders milliseconds when below one second', () => {
    expect(formatDurationMs(250)).toBe('250ms');
  });

  it('renders seconds with one decimal when >= 1000ms', () => {
    expect(formatDurationMs(1500)).toBe('1.5s');
  });

  it('guards against invalid input', () => {
    expect(formatDurationMs(-5)).toBe('0ms');
    expect(formatDurationMs('nope')).toBe('0ms');
  });
});

describe('resolveBoolean', () => {
  it('understands various truthy forms', () => {
    expect(resolveBoolean(true)).toBe(true);
    expect(resolveBoolean(' YES ')).toBe(true);
    expect(resolveBoolean('1')).toBe(true);
  });

  it('rejects falsy or empty inputs', () => {
    expect(resolveBoolean(false)).toBe(false);
    expect(resolveBoolean('')).toBe(false);
    expect(resolveBoolean('off')).toBe(false);
  });
});

describe('normalizeCollectionUris', () => {
  it('deduplicates entries and drops non-strings', () => {
    const input = [' https://a.test/one ', 42, 'https://a.test/one', null, 'https://b.test/two'];
    expect(normalizeCollectionUris(input)).toEqual([
      'https://a.test/one',
      'https://b.test/two',
    ]);
  });
});

describe('slug helpers', () => {
  it('clamps overly long slugs without trailing separators', () => {
    expect(clampSlugLength('alpha-beta-', 10)).toBe('alpha-beta');
  });

  it('detects slugs that exceed the max length', () => {
    expect(isSlugTooLong('a'.repeat(51))).toBe(true);
    expect(isSlugTooLong('short')).toBe(false);
  });

  it('normalizes and truncates fallback bases', () => {
    expect(normalizeSlugBase('', 'fallback-slug')).toBe('fallback-slug');
  });

  it('builds suffixed slugs that respect the length limit', () => {
    const slug = buildSlugWithSuffix('really-long-title-with-many-parts', 'fallback', 3);
    expect(slug.endsWith('-3')).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(50);
  });
});

describe('normalizeStringList', () => {
  it('trims and stringifies values while dropping empties', () => {
    const values = [' One ', '', 2, null, undefined, 'Two'];
    expect(normalizeStringList(values)).toEqual(['One', '2', 'Two']);
  });
});

describe('ensureThumbnailValue', () => {
  it('populates thumbnail metadata only when empty', () => {
    const target = {};
    const changed = ensureThumbnailValue(target, 'https://example.com/thumb.jpg', 320, 200);
    expect(changed).toBe(true);
    expect(target).toEqual({
      thumbnail: 'https://example.com/thumb.jpg',
      thumbnailWidth: 320,
      thumbnailHeight: 200,
    });

    expect(ensureThumbnailValue(target, 'https://example.com/new.jpg', 640, 480)).toBe(false);
    expect(target.thumbnail).toBe('https://example.com/thumb.jpg');
  });
});

describe('extractSummaryValues + truncateSummary', () => {
  it('combines nested summary entries and truncates long text', () => {
    const manifest = {
      summary: [
        ' First ',
        [{ en: ['Second'] }, 'Third'],
        { none: ['Fourth', 'Second'] },
      ],
    };

    const summary = extractSummaryValues(manifest);
    expect(summary).toBe('First Second Third Fourth');

    const truncated = truncateSummary(summary, 15);
    expect(truncated).toBe('First Second...');
  });
});

describe('extractMetadataValues', () => {
  const manifest = {
    metadata: [
      {
        label: { en: ['Creator'] },
        value: ['Alpha', 'Alpha', { none: ['Beta'] }],
      },
      {
        label: { en: ['Year'] },
        value: '2024',
      },
      {
        label: { en: ['Ignored'] },
        value: 'Nope',
      },
    ],
  };

  it('filters by configured labels', () => {
    const labelsSet = new Set(['creator']);
    expect(extractMetadataValues(manifest, { labelsSet })).toEqual(['Alpha', 'Beta']);
  });

  it('includes everything when includeAll is set', () => {
    expect(extractMetadataValues(manifest, { includeAll: true })).toEqual([
      'Alpha',
      'Beta',
      '2024',
      'Nope',
    ]);
  });
});

describe('extractAnnotationText', () => {
  it('walks annotations and collects textual bodies for allowed motivations', () => {
    const manifest = {
      items: [
        {
          annotations: [
            {
              items: [
                {
                  motivation: 'commenting',
                  body: [
                    { type: 'TextualBody', value: 'First' },
                    { value: '<strong>Second</strong>' },
                    { type: 'TextualBody', body: { value: 'Third' } },
                    { value: 'First' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = extractAnnotationText(manifest, {
      enabled: true,
      motivations: new Set(['commenting']),
    });

    expect(result).toBe('First Second Third');
  });

  it('returns an empty string when disabled', () => {
    expect(extractAnnotationText({}, { enabled: false })).toBe('');
  });
});

describe('normalizeIiifId + normalizeIiifType', () => {
  it('produces deterministic query ordering for URLs', () => {
    const raw = 'https://example.org/iiif/manifest?b=2&a=1&b=1';
    expect(normalizeIiifId(raw)).toBe('https://example.org/iiif/manifest?a=1&b=1&b=2');
  });

  it('passes through non-http identifiers as-is', () => {
    expect(normalizeIiifId('urn:example:foo')).toBe('urn:example:foo');
  });

  it('normalizes IIIF resource types', () => {
    expect(normalizeIiifType(' Manifest ')).toBe('manifest');
    expect(normalizeIiifType('')).toBe('');
  });
});

describe('resolveParentFromPartOf', () => {
  it('returns the first available parent id from either id or @id', () => {
    const resource = {
      partOf: [
        { id: 'https://example.org/collections/a' },
        { '@id': 'https://example.org/collections/b' },
      ],
    };
    expect(resolveParentFromPartOf(resource)).toBe('https://example.org/collections/a');
  });

  it('falls back to an empty string when missing', () => {
    expect(resolveParentFromPartOf({})).toBe('');
  });
});

describe('computeUniqueSlug', () => {
  beforeEach(() => {
    resetReservedSlugs();
  });

  it('reuses an existing slug for the same manifest id', () => {
    const index = {
      byId: [
        {
          id: 'https://example.org/iiif/manifest?a=1&b=2',
          slug: 'work-item',
          type: 'Manifest',
        },
      ],
    };
    const slug = computeUniqueSlug(
      index,
      'work-item',
      'https://example.org/iiif/manifest?b=2&a=1',
      'Manifest'
    );
    expect(slug).toBe('work-item');
  });

  it('increments suffixes when the base is already taken', () => {
    const index = {
      byId: [
        {
          id: 'https://example.org/iiif/manifest?a=1',
          slug: 'shared-slug',
          type: 'Manifest',
        },
      ],
    };
    const slug = computeUniqueSlug(
      index,
      'shared-slug',
      'https://example.org/iiif/manifest?a=2',
      'Manifest'
    );
    expect(slug.startsWith('shared-slug-')).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  it('leaves existing entries untouched when ensureBaseSlugFor is invoked for the same id', () => {
    const index = {
      byId: [
        {
          id: 'https://example.org/iiif/manifest?a=1',
          slug: 'anchor',
          type: 'Manifest',
        },
      ],
    };
    const result = ensureBaseSlugFor(
      index,
      'anchor',
      'https://example.org/iiif/manifest?a=1',
      'Manifest'
    );
    expect(result).toBe('anchor');
    expect(index.byId[0].slug).toBe('anchor');
  });
});
