/**
 * Décisions locales autour de l'alarme et de la liaison perdue —
 * cahier-des-charges.md F-30 à F-38. Le BB seul décide et déclenche
 * l'alarme (`deviceStore.activeAlarm`) ; ce module ne gère que
 * l'acquittement local (F-34 à F-36) et la détection de liaison perdue
 * pendant un mouillage actif (F-37), jamais l'alarme elle-même.
 */
import type { BoardState } from '@/src/ble/protocol';

/** Durée de coupure BLE avant notification « liaison perdue » — F-37. */
export const LINK_LOST_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * L'alarme reste visible (popup F-31 + bandeau F-36) tant qu'elle n'a pas
 * été acquittée localement, indépendamment de la liaison BLE : une coupure
 * pendant l'alarme ne doit pas la faire disparaître (F-36). `acknowledgedTs`
 * est le `ts` de la dernière alarme acquittée par l'utilisateur ; un
 * nouveau `ts` (redéclenchement, F-35) redevient donc visible.
 */
export function isAlarmVisible(alarmTs: number | null, acknowledgedTs: number | null): boolean {
  return alarmTs !== null && alarmTs !== acknowledgedTs;
}

/** Une notification « liaison perdue » n'a de sens que pendant un mouillage actif — F-37. */
export function isMonitoringActive(boardState: BoardState | null): boolean {
  return boardState === 'anchored' || boardState === 'alarm';
}

/** Vrai si la coupure dure depuis au moins `LINK_LOST_THRESHOLD_MS` — F-37. */
export function isLinkLost(disconnectedSinceMs: number | null, nowMs: number): boolean {
  return disconnectedSinceMs !== null && nowMs - disconnectedSinceMs >= LINK_LOST_THRESHOLD_MS;
}
