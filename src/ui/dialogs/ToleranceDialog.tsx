/**
 * Popup de réglage de la tolérance avant démarrage du mouillage —
 * cahier-des-charges.md F-19 : curseur + valeur chiffrée, 5–25 m.
 */
import Slider from '@react-native-community/slider';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { MAX_TOLERANCE_M, MIN_TOLERANCE_M } from '@/src/ble/protocol';
import { COLORS, SIZES } from '@/src/ui/theme';

export interface ToleranceDialogProps {
  visible: boolean;
  toleranceM: number;
  onChangeTolerance: (toleranceM: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ToleranceDialog({ visible, toleranceM, onChangeTolerance, onConfirm, onCancel }: ToleranceDialogProps) {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={styles.title}>{t('anchor.toleranceDialog.title')}</Text>
          <Text style={styles.description}>{t('anchor.toleranceDialog.description')}</Text>
          <Text style={[styles.value, { color: colors.accent }]}>
            {t('anchor.toleranceDialog.value', { value: toleranceM })}
          </Text>
          <Slider
            accessibilityLabel={t('anchor.toleranceDialog.title')}
            minimumValue={MIN_TOLERANCE_M}
            maximumValue={MAX_TOLERANCE_M}
            step={1}
            value={toleranceM}
            onValueChange={onChangeTolerance}
            minimumTrackTintColor={colors.accent}
            thumbTintColor={colors.accent}
          />
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              style={[styles.button, styles.secondaryButton, { borderColor: colors.muted }]}
              onPress={onCancel}>
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('anchor.toleranceDialog.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={onConfirm}>
              <Text style={styles.buttonText}>{t('anchor.toleranceDialog.confirm')}</Text>
            </Pressable>
          </View>
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
  description: {
    fontSize: SIZES.bodyFontSizePt - 2,
  },
  value: {
    fontSize: SIZES.valueFontSizePt,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SIZES.spacingPt / 2,
    marginTop: SIZES.spacingPt / 2,
  },
  button: {
    flex: 1,
    minHeight: SIZES.minTouchTargetPt,
    borderRadius: SIZES.radiusPt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: SIZES.bodyFontSizePt,
  },
});
