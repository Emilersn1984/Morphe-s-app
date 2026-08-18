/**
 * Qualité du point GPS affichée à l'écran Carte — cahier-des-charges.md
 * F-13. `fix` vient du BB (architecture.md §5.4) : 0 = pas de point, 2 = 2D,
 * 3 = 3D (le plus fiable, avec l'altitude).
 */
import type { BoatFix } from '@/src/ble/protocol';

export function gpsQualityTranslationKey(fix: BoatFix['fix']): string {
  switch (fix) {
    case 0:
      return 'map.gpsQuality.none';
    case 2:
      return 'map.gpsQuality.twoD';
    case 3:
      return 'map.gpsQuality.threeD';
  }
}
