import { isAlarmVisible, isLinkLost, isMonitoringActive, LINK_LOST_THRESHOLD_MS } from '@/src/domain/alarm';

/** Acquittement local et liaison perdue — cahier-des-charges.md F-34 à F-37. */

describe('isAlarmVisible', () => {
  it('is not visible when there is no active alarm', () => {
    expect(isAlarmVisible(null, null)).toBe(false);
  });

  it('is visible when a new alarm has not been acknowledged yet', () => {
    expect(isAlarmVisible(1000, null)).toBe(true);
  });

  it('is hidden once the exact same alarm has been acknowledged (F-34)', () => {
    expect(isAlarmVisible(1000, 1000)).toBe(false);
  });

  it('becomes visible again on a re-trigger with a new ts, even after an ack (F-35)', () => {
    expect(isAlarmVisible(2000, 1000)).toBe(true);
  });
});

describe('isMonitoringActive', () => {
  it.each(['anchored', 'alarm'] as const)('is true while "%s"', (state) => {
    expect(isMonitoringActive(state)).toBe(true);
  });

  it.each(['idle', 'test', null] as const)('is false while "%s"', (state) => {
    expect(isMonitoringActive(state)).toBe(false);
  });
});

describe('isLinkLost', () => {
  it('is false when the link has never been reported lost', () => {
    expect(isLinkLost(null, Date.now())).toBe(false);
  });

  it('is false before the threshold', () => {
    const start = 10_000;
    expect(isLinkLost(start, start + LINK_LOST_THRESHOLD_MS - 1)).toBe(false);
  });

  it('is true once the threshold is reached (F-37)', () => {
    const start = 10_000;
    expect(isLinkLost(start, start + LINK_LOST_THRESHOLD_MS)).toBe(true);
  });
});
