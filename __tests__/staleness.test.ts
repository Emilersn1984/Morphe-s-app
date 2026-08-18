import { elapsedSince, elapsedTranslationKey } from '@/src/domain/staleness';

/** Âge des données affichées lors d'une coupure BLE — cahier-des-charges.md F-05. */

describe('elapsedSince', () => {
  it('buckets seconds under a minute', () => {
    expect(elapsedSince(0)).toEqual({ unit: 'seconds', count: 0 });
    expect(elapsedSince(45)).toEqual({ unit: 'seconds', count: 45 });
  });

  it('buckets minutes under an hour', () => {
    expect(elapsedSince(60)).toEqual({ unit: 'minutes', count: 1 });
    expect(elapsedSince(125)).toEqual({ unit: 'minutes', count: 2 });
  });

  it('buckets hours beyond an hour', () => {
    expect(elapsedSince(3600)).toEqual({ unit: 'hours', count: 1 });
    expect(elapsedSince(7260)).toEqual({ unit: 'hours', count: 2 });
  });

  it('never returns a negative duration', () => {
    expect(elapsedSince(-5)).toEqual({ unit: 'seconds', count: 0 });
  });
});

describe('elapsedTranslationKey', () => {
  it.each([
    ['seconds', 'staleness.secondsAgo'],
    ['minutes', 'staleness.minutesAgo'],
    ['hours', 'staleness.hoursAgo'],
  ] as const)('maps unit "%s" to "%s"', (unit, expected) => {
    expect(elapsedTranslationKey(unit)).toBe(expected);
  });
});
