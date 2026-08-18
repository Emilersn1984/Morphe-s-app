/**
 * Bandeau d'information générique (F-24 : ancre inconnue, F-06 : Bluetooth
 * désactivé, ...). Jamais de couleur seule : icône + texte.
 */
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { SIZES } from '@/src/ui/theme';

export interface BannerProps {
  message: string;
}

export function Banner({ message }: BannerProps) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacingPt / 2,
    backgroundColor: '#fff3cd',
    borderRadius: SIZES.radiusPt,
    padding: SIZES.spacingPt / 2,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    flex: 1,
    color: '#5a4200',
    fontSize: SIZES.bodyFontSizePt - 2,
  },
});
