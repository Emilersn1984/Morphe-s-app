import {
  batteryColorKey,
  initialBatteryAlarmState,
  updateBatteryAlarmState,
} from '@/src/domain/battery';

/** Seuils et popups de batterie — cahier-des-charges.md F-15, F-17. */

describe('batteryColorKey', () => {
  it.each([
    [100, 'good'],
    [51, 'good'],
    [50, 'medium'],
    [21, 'medium'],
    [20, 'low'],
    [11, 'low'],
    [10, 'critical'],
    [0, 'critical'],
  ])('classes %i%% as %s', (pct, expected) => {
    expect(batteryColorKey(pct)).toBe(expected);
  });
});

describe('updateBatteryAlarmState', () => {
  it('does not trigger above the low threshold', () => {
    const result = updateBatteryAlarmState(initialBatteryAlarmState, 45);
    expect(result.triggered).toBeNull();
  });

  it('triggers "low" exactly once when crossing 20%', () => {
    const first = updateBatteryAlarmState(initialBatteryAlarmState, 20);
    expect(first.triggered).toBe('low');

    const second = updateBatteryAlarmState(first.state, 18);
    expect(second.triggered).toBeNull();
  });

  it('triggers "critical" exactly once when crossing 10%, independent of "low"', () => {
    const low = updateBatteryAlarmState(initialBatteryAlarmState, 15);
    expect(low.triggered).toBe('low');

    const critical = updateBatteryAlarmState(low.state, 10);
    expect(critical.triggered).toBe('critical');

    const staysCritical = updateBatteryAlarmState(critical.state, 5);
    expect(staysCritical.triggered).toBeNull();
  });

  it('jumping straight to critical still reports "critical"', () => {
    const result = updateBatteryAlarmState(initialBatteryAlarmState, 3);
    expect(result.triggered).toBe('critical');
    expect(result.state.lowShown).toBe(true);
    expect(result.state.criticalShown).toBe(true);
  });

  it('re-arms both popups once recharged above 30%', () => {
    const critical = updateBatteryAlarmState(initialBatteryAlarmState, 5);
    const recharged = updateBatteryAlarmState(critical.state, 35);
    expect(recharged.state).toEqual(initialBatteryAlarmState);

    const again = updateBatteryAlarmState(recharged.state, 8);
    expect(again.triggered).toBe('critical');
  });
});
