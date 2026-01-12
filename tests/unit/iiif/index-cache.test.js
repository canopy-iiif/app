const path = require('path');
const iiif = require('../../../packages/app/lib/build/iiif');
const common = require('../../../packages/app/lib/common');

const {
  resolveThumbnailPreferences,
  loadManifestIndex,
  saveManifestIndex,
  paths,
} = iiif.__TESTING__;

const { IIIF_CACHE_INDEX, IIIF_CACHE_INDEX_LEGACY, IIIF_CACHE_INDEX_MANIFESTS } = paths;

describe('resolveThumbnailPreferences', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls back to defaults when env is unset', () => {
    delete process.env.CANOPY_THUMBNAIL_SIZE;
    delete process.env.CANOPY_THUMBNAILS_UNSAFE;

    expect(resolveThumbnailPreferences()).toEqual({
      size: 400,
      unsafe: false,
    });
  });

  it('parses env strings into numeric and boolean values', () => {
    process.env.CANOPY_THUMBNAIL_SIZE = '512';
    process.env.CANOPY_THUMBNAILS_UNSAFE = 'true';

    expect(resolveThumbnailPreferences()).toEqual({
      size: 512,
      unsafe: true,
    });
  });
});

describe('manifest index persistence', () => {
  const files = new Map();
  let writeSpy;
  let readSpy;
  let rmSpy;
  let existsSpy;

  beforeEach(() => {
    files.clear();
    jest.spyOn(common, 'ensureDirSync').mockImplementation(() => {});
    writeSpy = jest
      .spyOn(common.fsp, 'writeFile')
      .mockImplementation(async (target, contents) => {
        files.set(path.resolve(target), contents);
      });
    readSpy = jest.spyOn(common.fsp, 'readFile').mockImplementation(async (target) => {
      const key = path.resolve(target);
      if (!files.has(key)) throw new Error('ENOENT');
      return files.get(key);
    });
    rmSpy = jest.spyOn(common.fsp, 'rm').mockImplementation(async (target) => {
      files.delete(path.resolve(target));
    });
    existsSpy = jest
      .spyOn(common.fs, 'existsSync')
      .mockImplementation((target) => files.has(path.resolve(target)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    files.clear();
  });

  it('returns an empty structure when no files exist', async () => {
    existsSpy.mockReturnValue(false);

    const result = await loadManifestIndex();
    expect(result).toEqual({ byId: [], collection: null });
  });

  it('reads from the primary index file and normalizes object maps', async () => {
    const data = {
      byId: {
        'https://example.org/iiif/manifest': 'work-a',
      },
      parents: {
        'https://example.org/iiif/manifest': 'https://example.org/collections/root',
      },
      collection: { id: 'https://example.org/collections/root' },
    };
    files.set(IIIF_CACHE_INDEX, JSON.stringify(data));

    const result = await loadManifestIndex();
    expect(result).toEqual({
      byId: [
        {
          id: 'https://example.org/iiif/manifest',
          type: 'Manifest',
          slug: 'work-a',
          parent: 'https://example.org/collections/root',
        },
      ],
      collection: { id: 'https://example.org/collections/root' },
    });
  });

  it('writes the normalized index file and removes legacy outputs', async () => {
    await saveManifestIndex({
      byId: [{ id: 'https://example.org/iiif/manifest', type: 'Manifest', slug: 'work-a', parent: '' }],
      collection: null,
      version: 'test',
    });

    expect(writeSpy).toHaveBeenCalledWith(
      IIIF_CACHE_INDEX,
      JSON.stringify(
        {
          byId: [{ id: 'https://example.org/iiif/manifest', type: 'Manifest', slug: 'work-a', parent: '' }],
          collection: null,
          version: 'test',
        },
        null,
        2
      ),
      'utf8'
    );
    expect(rmSpy).toHaveBeenCalledWith(IIIF_CACHE_INDEX_LEGACY, { force: true });
    expect(rmSpy).toHaveBeenCalledWith(IIIF_CACHE_INDEX_MANIFESTS, { force: true });
  });
});
