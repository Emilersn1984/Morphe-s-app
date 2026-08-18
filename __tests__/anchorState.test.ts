import { anchorStateLabelKey, anchorZoneColorKey } from '@/src/domain/anchorState';

/** Couleur et libellé de l'état du mouillage — cahier-des-charges.md F-13, F-13b. */

describe('anchorZoneColorKey', () => {
  it('is "safe" at rest with no out-of-zone reading', () => {
    expect(anchorZoneColorKey('idle', 0)).toBe('safe');
  });

  it('is "safe" while anchored and inside the zone', () => {
    expect(anchorZoneColorKey('anchored', 0)).toBe('safe');
  });

  it('is "warning" from the 1st counted out-of-zone reading (pre-alert)', () => {
    expect(anchorZoneColorKey('anchored', 1)).toBe('warning');
    expect(anchorZoneColorKey('anchored', 4)).toBe('warning');
  });

  it('is "alarm" once the board has declared the alarm, regardless of `out`', () => {
    expect(anchorZoneColorKey('alarm', 5)).toBe('alarm');
    expect(anchorZoneColorKey('alarm', 0)).toBe('alarm');
  });
});

describe('anchorStateLabelKey', () => {
  it.each([
    ['idle', 'map.state.idle'],
    ['anchored', 'map.state.anchored'],
    ['alarm', 'map.state.alarm'],
    ['test', 'map.state.test'],
  ] as const)('maps board state "%s" to "%s"', (state, expected) => {
    expect(anchorStateLabelKey(state)).toBe(expected);
  });
});
