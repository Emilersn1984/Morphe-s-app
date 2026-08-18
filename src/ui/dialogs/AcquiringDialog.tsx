/**
 * « Acquisition en cours… » — cahier-des-charges.md F-20b : affiché tant
 * que le BB n'a pas de position fiable (GPS bateau ou tourelle), annulable,
 * le mouillage démarre automatiquement dès que le BB confirme.
 */
import { ActivityIndicator, Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { AcquiringReason } from '@/src/domain/anchorCommand';
import { COLORS, SIZES } from '@/src/ui/theme';

export interface AcquiringDialogProps {
  visible: boolean;
  reason: AcquiringReason | null;
  onCancel: () => void;
}

export function AcquiringDialog({ visible, reason, onCancel }: AcquiringDialogProps) {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.title}>{t('anchor.acquiring.title')}</Text>
          <Text style={styles.message}>{t(`anchor.acquiring.missing.${reason ?? 'gps'}`)}</Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { borderColor: colors.muted }]}
            onPress={onCancel}>
            <Text style={{ color: colors.text }}>{t('anchor.acquiring.cancel')}</Text>
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
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.valueFontSizePt - 6,
    fontWeight: '700',
  },
  message: {
    fontSize: SIZES.bodyFontSizePt,
    textAlign: 'center',
  },
  button: {
    minHeight: SIZES.minTouchTargetPt,
    minWidth: 140,
    borderRadius: SIZES.radiusPt,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.spacingPt / 2,
  },
});
