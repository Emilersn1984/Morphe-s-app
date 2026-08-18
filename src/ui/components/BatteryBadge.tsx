/**
 * Badge batterie style « iPhone » — cahier-des-charges.md F-14 à F-16.
 * Pictogramme rempli en proportion + pourcentage + éclair si en charge.
 * La couleur seule ne porte jamais l'information : le pourcentage écrit et
 * la forme du pictogramme la doublent (guidelines-de-developpement.md §4.3).
 */
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { batteryColorKey } from '@/src/domain/battery';
import { BATTERY_COLORS, COLORS } from '@/src/ui/theme';

export interface BatteryBadgeProps {
  batteryPct: number;
  charging: boolean;
  /** Libellé accessible complet, ex. « Batterie boîtier : 82 %, en charge » (F-14). */
  accessibilityLabel: string;
}

export function BatteryBadge({ batteryPct, charging, accessibilityLabel }: BatteryBadgeProps) {
  const colors = COLORS[useColorScheme()];
  const color = BATTERY_COLORS[batteryColorKey(batteryPct)];

  return (
    <View style={styles.container} accessible accessibilityLabel={accessibilityLabel}>
      <View style={[styles.batteryShape, { borderColor: color }]}>
        <View style={[styles.batteryFill, { backgroundColor: color, width: `${Math.max(4, batteryPct)}%` }]} />
      </View>
      <View style={[styles.batteryTip, { backgroundColor: color }]} />
      <Text style={[styles.percent, { color: colors.text }]}>{Math.round(batteryPct)}%</Text>
      {charging ? (
        <SymbolView name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }} tintColor="#2e7d32" size={14} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  batteryShape: {
    width: 22,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 2,
    padding: 1,
    justifyContent: 'center',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 1,
  },
  batteryTip: {
    width: 2,
    height: 5,
    borderRadius: 1,
    marginLeft: -1,
  },
  percent: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
