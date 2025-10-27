const { computeHeroHeightStyle } = require('../packages/app/ui/src/interstitials/hero-utils.cjs');

describe('Hero height style (via util)', () => {
  test('number -> px', () => {
    expect(computeHeroHeightStyle(360)).toEqual({ width: '100%', height: '360px' });
    expect(computeHeroHeightStyle(0)).toEqual({ width: '100%', height: '0px' });
  });

  test('string passthrough', () => {
    expect(computeHeroHeightStyle('420px')).toEqual({ width: '100%', height: '420px' });
    expect(computeHeroHeightStyle(' 50vh ')).toEqual({ width: '100%', height: '50vh' });
  });

  test('default fallback when missing', () => {
    expect(computeHeroHeightStyle()).toEqual({ width: '100%', height: '360px' });
    expect(computeHeroHeightStyle(null)).toEqual({ width: '100%', height: '360px' });
    expect(computeHeroHeightStyle('')).toEqual({ width: '100%', height: '360px' });
  });
});
