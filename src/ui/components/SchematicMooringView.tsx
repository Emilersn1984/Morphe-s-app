/**
 * Vue schématique de repli — cahier-des-charges.md N-11/N-12 : sans fond de
 * carte (pas de réseau, ou plateforme sans carte native), la géométrie reste
 * lisible grâce à un fond neutre, une échelle en mètres et une rose des
 * vents. Aucune donnée n'est recalculée ici : positions et cercle viennent
 * de la même source que la carte réelle (`domain/geo.ts`).
 */
import { StyleSheet, View as RNView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { Coordinate } from '@/src/domain/geo';
import { localOffsetM } from '@/src/domain/geo';
import type { AnchorZoneColorKey } from '@/src/domain/anchorState';
import { COLORS, SIZES } from '@/src/ui/theme';

const BOX_SIZE_PT = 220;
const CENTER_PT = BOX_SIZE_PT / 2;
/** Rayon (pt) alloué au cercle de tolérance à l'écran, quel que soit `toleranceM`. */
const TOLERANCE_RADIUS_PT = 70;
/** Distance max affichable avant d'accrocher le marqueur au bord (évite qu'il sorte du cadre). */
const MAX_MARKER_RADIUS_PT = 95;

export interface SchematicMooringViewProps {
  reference: Coordinate;
  boat: Coordinate;
  anchor: Coordinate | null;
  toleranceM: number;
  zoneColorKey: AnchorZoneColorKey;
}

function toScreenOffset(originM: { north: number; east: number }, pixelsPerMeter: number) {
  const xPt = originM.east * pixelsPerMeter;
  const yPt = -originM.north * pixelsPerMeter; // écran : y croît vers le bas
  const distancePt = Math.hypot(xPt, yPt);
  if (distancePt <= MAX_MARKER_RADIUS_PT || distancePt === 0) {
    return { x: xPt, y: yPt };
  }
  const scale = MAX_MARKER_RADIUS_PT / distancePt;
  return { x: xPt * scale, y: yPt * scale };
}

export function SchematicMooringView({ reference, boat, anchor, toleranceM, zoneColorKey }: SchematicMooringViewProps) {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];
  const pixelsPerMeter = TOLERANCE_RADIUS_PT / toleranceM;

  const boatOffset = toScreenOffset(localOffsetM(reference, boat), pixelsPerMeter);
  const anchorOffset = anchor ? toScreenOffset(localOffsetM(reference, anchor), pixelsPerMeter) : null;
  const zoneColor = colors[`anchorZone${capitalize(zoneColorKey)}` as keyof typeof colors] as string;

  return (
    <View style={[styles.container, { borderColor: colors.muted }]}>
      <Text style={[styles.offlineLabel, { color: colors.muted }]}>{t('map.schematic.noMapData')}</Text>

      <RNView style={styles.box}>
        {/* Rose des vents (N-12) */}
        <Text style={[styles.compassLabel, styles.north, { color: colors.muted }]}>N</Text>
        <Text style={[styles.compassLabel, styles.south, { color: colors.muted }]}>S</Text>
        <Text style={[styles.compassLabel, styles.east, { color: colors.muted }]}>E</Text>
        <Text style={[styles.compassLabel, styles.west, { color: colors.muted }]}>O</Text>

        {/* Cercle de tolérance figé sur la référence (F-11) */}
        <RNView
          style={[
            styles.toleranceCircle,
            {
              borderColor: zoneColor,
              backgroundColor: `${zoneColor}33`,
              left: CENTER_PT - TOLERANCE_RADIUS_PT,
              top: CENTER_PT - TOLERANCE_RADIUS_PT,
            },
          ]}
        />

        {/* Repère de référence figé (F-11b) */}
        <RNView style={[styles.referenceDot, { left: CENTER_PT - 3, top: CENTER_PT - 3, backgroundColor: colors.text }]} />

        {anchorOffset ? (
          <RNView
            accessibilityLabel={t('map.anchorMarker')}
            style={[styles.marker, styles.anchorMarker, { left: CENTER_PT + anchorOffset.x - 8, top: CENTER_PT + anchorOffset.y - 8 }]}
          />
        ) : null}

        <RNView
          accessibilityLabel={t('map.boatMarker')}
          style={[
            styles.marker,
            styles.boatMarker,
            { left: CENTER_PT + boatOffset.x - 8, top: CENTER_PT + boatOffset.y - 8, borderColor: colors.accent },
          ]}
        />
      </RNView>

      <Text style={[styles.scaleLabel, { color: colors.muted }]}>{t('map.schematic.scale', { meters: toleranceM })}</Text>
    </View>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SIZES.spacingPt / 2,
    padding: SIZES.spacingPt,
  },
  offlineLabel: {
    fontSize: SIZES.bodyFontSizePt - 3,
    fontWeight: '600',
  },
  box: {
    width: BOX_SIZE_PT,
    height: BOX_SIZE_PT,
  },
  compassLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
  },
  north: { left: CENTER_PT - 4, top: 0 },
  south: { left: CENTER_PT - 4, bottom: 0 },
  east: { right: 0, top: CENTER_PT - 6 },
  west: { left: 0, top: CENTER_PT - 6 },
  toleranceCircle: {
    position: 'absolute',
    width: TOLERANCE_RADIUS_PT * 2,
    height: TOLERANCE_RADIUS_PT * 2,
    borderRadius: TOLERANCE_RADIUS_PT,
    borderWidth: 2,
  },
  referenceDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  marker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  anchorMarker: {
    backgroundColor: '#6b4f2a',
  },
  boatMarker: {
    backgroundColor: 'transparent',
    borderWidth: 3,
  },
  scaleLabel: {
    fontSize: SIZES.bodyFontSizePt - 3,
  },
});
