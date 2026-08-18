import { distanceM, localOffsetM, offsetCoordinate } from '@/src/domain/geo';

/** Calculs géographiques — architecture.md §10, guidelines-de-developpement.md §5. */

const ORIGIN = { lat: 43.123456, lon: 5.987654 };

describe('distanceM', () => {
  it('is 0 for the same point', () => {
    expect(distanceM(ORIGIN, ORIGIN)).toBeCloseTo(0, 3);
  });

  it('matches a known offset within a small margin (planar approximation)', () => {
    const point = offsetCoordinate(ORIGIN, 10, 0); // 10 m nord
    expect(distanceM(ORIGIN, point)).toBeCloseTo(10, 1);
  });
});

describe('offsetCoordinate / localOffsetM', () => {
  it('localOffsetM is the inverse of offsetCoordinate', () => {
    const point = offsetCoordinate(ORIGIN, 12, -7);
    const { north, east } = localOffsetM(ORIGIN, point);
    expect(north).toBeCloseTo(12, 3);
    expect(east).toBeCloseTo(-7, 3);
  });

  it('is {0, 0} for the origin itself', () => {
    expect(localOffsetM(ORIGIN, ORIGIN)).toEqual({ north: 0, east: 0 });
  });
});
