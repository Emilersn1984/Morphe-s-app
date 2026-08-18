/**
 * Machine à états du mouillage — cahier-des-charges.md §4.2.1, F-13, F-13b.
 * Le BB seul décide (`st`, `out`) ; ce module ne fait que traduire son état
 * en libellé et en couleur pour l'écran Carte, jamais ne le recalcule.
 */
import type { BoardState } from '@/src/ble/protocol';

export type AnchorZoneColorKey = 'safe' | 'warning' | 'alarm';

/**
 * Couleur du cercle de surveillance — F-13b : vert tant que l'ancre reste
 * dans la zone, orange dès la 1ʳᵉ sortie comptée (compteur out/5), rouge en
 * alarme. Ne dépend jamais de la position du bateau.
 */
export function anchorZoneColorKey(boardState: BoardState, out: number): AnchorZoneColorKey {
  if (boardState === 'alarm') return 'alarm';
  if (out > 0) return 'warning';
  return 'safe';
}

/** Clé de traduction de l'état du mouillage affiché — F-13. */
export function anchorStateLabelKey(boardState: BoardState): string {
  switch (boardState) {
    case 'idle':
      return 'map.state.idle';
    case 'anchored':
      return 'map.state.anchored';
    case 'alarm':
      return 'map.state.alarm';
    case 'test':
      return 'map.state.test';
  }
}
