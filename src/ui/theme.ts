/**
 * Thème visuel de l'application (couleurs, tailles).
 *
 * Règle guidelines-de-developpement.md §1.5 : rien n'est codé en dur, toute
 * couleur ou taille vient d'ici, jamais d'une valeur littérale dans un
 * composant.
 */

const tintColorLight = '#2f95dc';
const tintColorDark = '#ffffff';

export const COLORS = {
  light: {
    text: '#0b1d2a',
    background: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    // Cercle de surveillance (cahier-des-charges.md F-13b)
    anchorZoneSafe: '#2e7d32',
    anchorZoneWarning: '#ef6c00',
    anchorZoneAlarm: '#c62828',
    // Boutons d'action principaux (F-18)
    accent: '#0a7ea4',
    danger: '#c62828',
    muted: '#6b7b83',
  },
  dark: {
    text: '#f2f6f8',
    background: '#05141c',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    anchorZoneSafe: '#4caf50',
    anchorZoneWarning: '#ffa726',
    anchorZoneAlarm: '#ef5350',
    accent: '#4fc3f7',
    danger: '#ef5350',
    muted: '#8fa0a8',
  },
};

/** Code couleur des batteries — cahier-des-charges.md F-15. */
export const BATTERY_COLORS = {
  good: '#2e7d32', // > 50 %
  medium: '#f9a825', // 21–50 %
  low: '#ef6c00', // 11–20 %
  critical: '#c62828', // <= 10 %
};

/** Tailles — guidelines-de-developpement.md §4 (règles marines). */
export const SIZES = {
  minTouchTargetPt: 48,
  bodyFontSizePt: 17,
  valueFontSizePt: 28,
  radiusPt: 12,
  spacingPt: 16,
};

export type ColorScheme = keyof typeof COLORS;
