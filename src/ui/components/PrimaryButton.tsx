/**
 * Bouton principal « Démarrer / Arrêter le mouillage » — cahier-des-charges.md
 * F-18 : pleine largeur, bas d'écran, couleur d'accent ; devient couleur de
 * danger une fois le mouillage actif pour bien marquer le changement d'action.
 */
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { COLORS, SIZES } from '@/src/ui/theme';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({ label, onPress, danger, disabled, loading }: PrimaryButtonProps) {
  const colors = COLORS[useColorScheme()];
  const backgroundColor = danger ? colors.danger : colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor }, (disabled || loading) && styles.disabled]}>
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: SIZES.minTouchTargetPt,
    borderRadius: SIZES.radiusPt,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.spacingPt,
    marginBottom: SIZES.spacingPt,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: SIZES.bodyFontSizePt,
  },
});
