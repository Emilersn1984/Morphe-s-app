/**
 * Cadre d'information permanent de l'écran Carte — cahier-des-charges.md
 * F-13/F-13b : écart ancre↔référence (valeur principale), distance
 * bateau↔ancre à titre indicatif, état du mouillage, pré-alerte « n/5 »,
 * qualité du point GPS, âge de la dernière position de la tourelle.
 */
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { anchorStateLabelKey } from '@/src/domain/anchorState';
import { gpsQualityTranslationKey } from '@/src/domain/gpsQuality';
import { elapsedSince, elapsedTranslationKey } from '@/src/domain/staleness';
import type { StatusEvent } from '@/src/ble/protocol';
import { COLORS, SIZES } from '@/src/ui/theme';

export interface InfoPanelProps {
  status: StatusEvent;
  /** Grisé quand les valeurs ne sont plus fraîches (F-05, données de la dernière trame connue). */
  stale: boolean;
}

export function InfoPanel({ status, stale }: InfoPanelProps) {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];
  const textColor = stale ? colors.muted : colors.text;
  const preAlert = status.out > 0 && status.st !== 'alarm';

  return (
    <View style={styles.container}>
      <Row
        label={t('map.state.label')}
        value={t(anchorStateLabelKey(status.st))}
        valueColor={status.st === 'alarm' ? colors.anchorZoneAlarm : textColor}
        emphasize
      />
      <Row
        label={t('map.drift')}
        value={t('map.meters', { value: status.drift.toFixed(1) })}
        valueColor={preAlert ? colors.anchorZoneWarning : textColor}
        emphasize
      />
      {preAlert ? (
        <Row label={t('map.preAlert')} value={t('map.outOfFive', { out: status.out })} valueColor={colors.anchorZoneWarning} />
      ) : null}
      <Row label={t('map.dist')} value={t('map.meters', { value: status.dist.toFixed(1) })} valueColor={textColor} />
      <Row label={t('map.gpsQuality.label')} value={t(gpsQualityTranslationKey(status.boat.fix))} valueColor={textColor} />
      <Row label={t('map.anchorAge')} value={t(elapsedTranslationKey(elapsedSince(status.anc.age).unit), { count: elapsedSince(status.anc.age).count })} valueColor={textColor} />
    </View>
  );
}

function Row({ label, value, valueColor, emphasize }: { label: string; value: string; valueColor: string; emphasize?: boolean }) {
  const colors = COLORS[useColorScheme()];
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }, emphasize && styles.valueEmphasized]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    padding: SIZES.spacingPt,
    borderRadius: SIZES.radiusPt,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: SIZES.bodyFontSizePt - 3,
  },
  value: {
    fontSize: SIZES.bodyFontSizePt,
    fontVariant: ['tabular-nums'],
  },
  valueEmphasized: {
    fontSize: SIZES.valueFontSizePt,
    fontWeight: '700',
  },
});
