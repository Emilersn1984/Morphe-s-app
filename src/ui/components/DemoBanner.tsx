/**
 * Bandeau « DÉMONSTRATION » — cahier-des-charges.md F-71 : non masquable,
 * affiché tant que l'app parle au boîtier simulé (le vrai transport BLE
 * arrive à l'étape 7).
 */
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { SIZES } from '@/src/ui/theme';

export function DemoBanner() {
  const { t } = useTranslation();

  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.text}>{t('demo.banner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9a825',
    paddingVertical: 4,
    alignItems: 'center',
  },
  text: {
    color: '#1a1a1a',
    fontSize: SIZES.bodyFontSizePt - 3,
    fontWeight: '700',
  },
});
