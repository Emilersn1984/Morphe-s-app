/**
 * Âge des données affichées — cahier-des-charges.md F-05 : en cas de coupure
 * BLE, les dernières valeurs connues restent affichées, grisées et
 * horodatées (« il y a 2 min »). Ne concerne que l'âge depuis la dernière
 * trame reçue par l'app, pas l'âge du point GPS (`boat.age`/`anc.age`, F-13),
 * qui vient directement du BB.
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export type ElapsedUnit = 'seconds' | 'minutes' | 'hours';

export interface ElapsedSince {
  unit: ElapsedUnit;
  count: number;
}

/** Découpe une durée en secondes en unité + valeur, pour interpolation i18n. */
export function elapsedSince(elapsedSeconds: number): ElapsedSince {
  const seconds = Math.max(0, Math.floor(elapsedSeconds));
  if (seconds < SECONDS_PER_MINUTE) {
    return { unit: 'seconds', count: seconds };
  }
  if (seconds < SECONDS_PER_HOUR) {
    return { unit: 'minutes', count: Math.floor(seconds / SECONDS_PER_MINUTE) };
  }
  return { unit: 'hours', count: Math.floor(seconds / SECONDS_PER_HOUR) };
}

/** Clé de traduction i18next correspondant à l'unité (pluralisation gérée par i18next). */
export function elapsedTranslationKey(unit: ElapsedUnit): string {
  return `staleness.${unit}Ago`;
}
