/**
 * Popup plein écran de l'alarme — cahier-des-charges.md F-31, F-34 à F-36.
 * Non ambigu (icône + « ALARME — dérapage d'ancre » + écart mesuré + heure),
 * ne peut être fermé que par le bouton d'acquittement (F-36 : reste affiché
 * jusqu'à acquittement explicite, même en cas de coupure BLE entretemps).
 */
import { Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import type { AlarmEvent } from '@/src/ble/protocol';
import { COLORS, SIZES } from '@/src/ui/theme';

export interface AlarmDialogProps {
  visible: boolean;
  alarm: AlarmEvent | null;
  onAcknowledge: () => void;
}

export function AlarmDialog({ visible, alarm, onAcknowledge }: AlarmDialogProps) {
  const { t } = useTranslation();
  const colors = COLORS.dark; // Contraste garanti quel que soit le thème système (alarme non ambiguë).

  const time = alarm ? new Date(alarm.ts * 1000).toLocaleTimeString() : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.overlay, { backgroundColor: colors.danger }]}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{t(`alarm.title.${alarm?.reason ?? 'drag'}`)}</Text>
        {alarm ? (
          <>
            <Text style={styles.detail}>{t('alarm.drift', { value: alarm.drift })}</Text>
            <Text style={styles.detail}>{t('alarm.time', { time })}</Text>
          </>
        ) : null}
        <Text style={styles.silentWarning}>{t('alarm.silentModeWarning')}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={onAcknowledge}>
          <Text style={[styles.buttonText, { color: colors.danger }]}>{t('alarm.stopButton')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacingPt * 1.5,
    gap: SIZES.spacingPt / 2,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    color: '#ffffff',
    fontSize: SIZES.valueFontSizePt - 2,
    fontWeight: '800',
    textAlign: 'center',
  },
  detail: {
    color: '#ffffff',
    fontSize: SIZES.bodyFontSizePt,
    textAlign: 'center',
  },
  silentWarning: {
    color: '#ffffff',
    fontSize: SIZES.bodyFontSizePt - 3,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: SIZES.spacingPt / 2,
  },
  button: {
    minHeight: SIZES.minTouchTargetPt,
    minWidth: 260,
    borderRadius: SIZES.radiusPt,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.spacingPt,
    paddingHorizontal: SIZES.spacingPt,
  },
  buttonText: {
    fontWeight: '800',
    fontSize: SIZES.bodyFontSizePt + 2,
  },
});
