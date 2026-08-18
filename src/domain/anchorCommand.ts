/**
 * Logique du cycle démarrer/arrêter le mouillage — cahier-des-charges.md
 * F-18 à F-20b, architecture.md §4.2 et §5.3.
 *
 * Le BB seul décide de l'état du mouillage (`status.st`) ; ce module ne
 * gère que l'état *local et transitoire* de la commande en cours (popup de
 * tolérance ouverte, attente d'un fix GPS/tourelle, attente de l'accusé de
 * réception). Aucune interface optimiste : `phase` retombe à `idle` sans
 * qu'aucun état « actif » ne soit affiché avant la confirmation du BB
 * (F-20).
 */
import type { ErrorCode } from '@/src/ble/protocol';

export type AnchorCommandPhase =
  | 'idle'
  | 'settingTolerance'
  | 'acquiring'
  | 'sending'
  | 'confirmingStop'
  | 'stopping';

/** Ce qui manque au BB pour démarrer le mouillage — F-20b. */
export type AcquiringReason = 'gps' | 'turret';

/** Intervalle de réessai automatique tant que le BB n'a pas de position fiable — F-20b. */
export const ANCHOR_START_RETRY_MS = 5000;

/** Tolérance proposée avant tout premier mouillage — F-19, milieu de la plage 5–25 m. */
export const DEFAULT_TOLERANCE_M = 15;

/**
 * Traduit un refus du BB en raison d'attente locale, ou `null` si le refus
 * n'est pas lié à l'acquisition d'une position (dans ce cas, c'est une
 * erreur à afficher, pas une attente à réessayer automatiquement).
 */
export function acquiringReasonFor(err: ErrorCode): AcquiringReason | null {
  if (err === 'ERR_NO_FIX') return 'gps';
  if (err === 'ERR_NO_TURRET') return 'turret';
  return null;
}
