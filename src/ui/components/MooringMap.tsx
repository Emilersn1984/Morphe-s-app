/**
 * Carte native (Apple Maps / Google Maps) — architecture.md §2.1, N-10.
 * Bascule sur la vue schématique de repli si aucun réseau n'est disponible
 * (N-11/N-12) : la géométrie (points, cercle) reste toujours exacte, seul le
 * fond de carte dépend du réseau.
 */
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNetworkState } from 'expo-network';
import MapView, { Circle, Marker } from 'react-native-maps';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { Coordinate } from '@/src/domain/geo';
import type { AnchorZoneColorKey } from '@/src/domain/anchorState';
import { COLORS } from '@/src/ui/theme';
import { SchematicMooringView } from './SchematicMooringView';

export interface MooringMapProps {
  reference: Coordinate;
  boat: Coordinate;
  anchor: Coordinate | null;
  toleranceM: number;
  zoneColorKey: AnchorZoneColorKey;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MooringMap({ reference, boat, anchor, toleranceM, zoneColorKey }: MooringMapProps) {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];
  const network = useNetworkState();
  const zoneColor = colors[`anchorZone${capitalize(zoneColorKey)}` as keyof typeof colors] as string;

  // N-11/N-12 : pas de fond de carte fiable sans réseau, mais la géométrie
  // (points, cercle, distances) reste affichée via la vue schématique.
  if (network.isInternetReachable === false) {
    return (
      <SchematicMooringView
        reference={reference}
        boat={boat}
        anchor={anchor}
        toleranceM={toleranceM}
        zoneColorKey={zoneColorKey}
      />
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: reference.lat,
        longitude: reference.lon,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }}>
      <Circle
        center={{ latitude: reference.lat, longitude: reference.lon }}
        radius={toleranceM}
        strokeColor={zoneColor}
        fillColor={`${zoneColor}33`}
        strokeWidth={2}
      />
      <Marker
        coordinate={{ latitude: reference.lat, longitude: reference.lon }}
        anchor={{ x: 0.5, y: 0.5 }}
        accessibilityLabel={t('map.referenceMarker')}>
        <View style={[styles.referenceDot, { backgroundColor: colors.text }]} />
      </Marker>
      {anchor ? (
        <Marker
          coordinate={{ latitude: anchor.lat, longitude: anchor.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          accessibilityLabel={t('map.anchorMarker')}>
          <MarkerLabel emoji="⚓" label={t('map.anchorMarker')} color="#6b4f2a" textColor={colors.text} />
        </Marker>
      ) : null}
      <Marker
        coordinate={{ latitude: boat.lat, longitude: boat.lon }}
        anchor={{ x: 0.5, y: 0.5 }}
        accessibilityLabel={t('map.boatMarker')}>
        <MarkerLabel emoji="⛵" label={t('map.boatMarker')} color={colors.accent} textColor={colors.text} />
      </Marker>
    </MapView>
  );
}

function MarkerLabel({ emoji, label, color, textColor }: { emoji: string; label: string; color: string; textColor: string }) {
  return (
    <View style={styles.markerLabelContainer}>
      <View style={[styles.markerBubble, { borderColor: color }]}>
        <Text style={styles.markerEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.markerText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  referenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markerLabelContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEmoji: {
    fontSize: 16,
  },
  markerText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
