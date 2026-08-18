/**
 * Popup « Batterie faible » — cahier-des-charges.md F-17. Nomme l'élément
 * concerné (boîtier / tourelle) et le seuil franchi (bas / critique).
 */
import { Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { BatteryThreshold } from '@/src/domain/battery';
import { COLORS, SIZES } from '@/src/ui/theme';

export type BatteryElement = 'board' | 'turret';

export interface LowBatteryAlert {
  element: BatteryElement;
  threshold: BatteryThreshold;
}

export interface LowBatteryDialogProps {
  alert: LowBatteryAlert | null;
  onDismiss: () => void;
}

export function LowBatteryDialog({ alert, onDismiss }: LowBatteryDialogProps) {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];

  return (
    <Modal visible={alert !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={styles.title}>{t(`battery.title.${alert?.threshold ?? 'low'}`)}</Text>
          <Text style={styles.message}>
            {t(`battery.message.${alert?.threshold ?? 'low'}`, {
              element: t(`battery.element.${alert?.element ?? 'board'}`),
            })}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={onDismiss}>
            <Text style={styles.buttonText}>{t('common.ok')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacingPt,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: SIZES.radiusPt,
    padding: SIZES.spacingPt,
    gap: SIZES.spacingPt / 2,
  },
  title: {
    fontSize: SIZES.valueFontSizePt - 6,
    fontWeight: '700',
  },
  message: {
    fontSize: SIZES.bodyFontSizePt,
  },
  button: {
    minHeight: SIZES.minTouchTargetPt,
    borderRadius: SIZES.radiusPt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.spacingPt / 2,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: SIZES.bodyFontSizePt,
  },
});
