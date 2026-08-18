/**
 * Confirmation avant d'arrêter le mouillage — cahier-des-charges.md F-18 :
 * « confirmation demandée avant arrêt ».
 */
import { Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { COLORS, SIZES } from '@/src/ui/theme';

export interface ConfirmStopDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmStopDialog({ visible, onConfirm, onCancel }: ConfirmStopDialogProps) {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={styles.title}>{t('anchor.confirmStop.title')}</Text>
          <Text style={styles.message}>{t('anchor.confirmStop.message')}</Text>
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              style={[styles.button, styles.secondaryButton, { borderColor: colors.muted }]}
              onPress={onCancel}>
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('anchor.confirmStop.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: colors.danger }]}
              onPress={onConfirm}>
              <Text style={styles.buttonText}>{t('anchor.confirmStop.confirm')}</Text>
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
  message: {
    fontSize: SIZES.bodyFontSizePt,
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
