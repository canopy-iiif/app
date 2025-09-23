const { computeHeroHeightStyle } = require('../packages/app/ui/src/iiif/hero-utils.js');

describe('Hero utils', () => {
  test('computes px height from number', () => {
    const s = computeHeroHeightStyle(420);
    expect(s).toEqual({ width: '100%', height: '420px' });
  });

  test('passes through string height', () => {
    const s = computeHeroHeightStyle('50vh');
    expect(s).toEqual({ width: '100%', height: '50vh' });
  });

  test('falls back to default when missing', () => {
    const s = computeHeroHeightStyle();
    expect(s).toEqual({ width: '100%', height: '360px' });
  });
});

