import { acquiringReasonFor } from '@/src/domain/anchorCommand';

/** Traduction des refus du BB en attente locale — cahier-des-charges.md F-20b. */

describe('acquiringReasonFor', () => {
  it('maps ERR_NO_FIX to "gps"', () => {
    expect(acquiringReasonFor('ERR_NO_FIX')).toBe('gps');
  });

  it('maps ERR_NO_TURRET to "turret"', () => {
    expect(acquiringReasonFor('ERR_NO_TURRET')).toBe('turret');
  });

  it.each(['ERR_PIN', 'ERR_BUSY', 'ERR_RANGE', 'ERR_GSM', 'ERR_SIM', 'ERR_UNKNOWN'] as const)(
    'returns null for "%s" (a real error, not an acquisition wait)',
    (err) => {
      expect(acquiringReasonFor(err)).toBeNull();
    }
  );
});
