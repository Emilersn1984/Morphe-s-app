/**
 * Seuils, couleurs et logique des popups de batterie — cahier-des-charges.md
 * F-14 à F-17, décision Q8 (§7) : seuils définis par l'app, pas par le BB.
 */

/** Seuil bas (F-17) : première popup « batterie faible ». */
export const LOW_BATTERY_PCT = 20;
/** Seuil critique (F-17) : seconde popup « batterie faible ». */
export const CRITICAL_BATTERY_PCT = 10;
/** Recharge au-dessus de ce seuil pour réarmer les popups (F-17). */
export const REARM_BATTERY_PCT = 30;
/** Bornes du code couleur — F-15. */
export const GOOD_BATTERY_PCT = 50;
export const MEDIUM_BATTERY_PCT = 21;

export type BatteryColorKey = 'good' | 'medium' | 'low' | 'critical';

/** Code couleur des batteries — cahier-des-charges.md F-15. */
export function batteryColorKey(batteryPct: number): BatteryColorKey {
  if (batteryPct > GOOD_BATTERY_PCT) return 'good';
  if (batteryPct >= MEDIUM_BATTERY_PCT) return 'medium';
  if (batteryPct > CRITICAL_BATTERY_PCT) return 'low';
  return 'critical';
}

export type BatteryThreshold = 'low' | 'critical';

export interface BatteryAlarmState {
  lowShown: boolean;
  criticalShown: boolean;
}

export const initialBatteryAlarmState: BatteryAlarmState = {
  lowShown: false,
  criticalShown: false,
};

export interface BatteryAlarmUpdate {
  state: BatteryAlarmState;
  /** Seuil venant d'être franchi à la baisse, à signaler par une popup (F-17). */
  triggered: BatteryThreshold | null;
}

/**
 * Fait évoluer l'état des popups « batterie faible » pour un élément (BB ou
 * tourelle) au vu d'un nouveau pourcentage. Pure fonction : testable sans
 * rendu, et réutilisable pour la batterie du boîtier comme de la tourelle.
 */
export function updateBatteryAlarmState(state: BatteryAlarmState, batteryPct: number): BatteryAlarmUpdate {
  if (batteryPct > REARM_BATTERY_PCT) {
    return { state: initialBatteryAlarmState, triggered: null };
  }

  if (batteryPct <= CRITICAL_BATTERY_PCT && !state.criticalShown) {
    return { state: { lowShown: true, criticalShown: true }, triggered: 'critical' };
  }

  if (batteryPct <= LOW_BATTERY_PCT && !state.lowShown) {
    return { state: { ...state, lowShown: true }, triggered: 'low' };
  }

  return { state, triggered: null };
}
