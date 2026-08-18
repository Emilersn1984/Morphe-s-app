import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import LanguageSelector from '@/src/ui/components/LanguageSelector';
import { COLORS, SIZES } from '@/src/ui/theme';

/**
 * Écran 2 — Réglages. Construit à l'étape 6
 * (cahier-des-charges.md §4.6, plan-de-developpement.md étape 6).
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const colors = COLORS[useColorScheme()];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>
      <Text style={styles.placeholder}>{t('settings.placeholder')}</Text>
      <LanguageSelector />
      {/* Outil de mise au point du contrat BLE, pas une fonctionnalité du cahier des charges (plan-de-developpement.md étape 1). */}
      <Link href="/dev" style={{ color: colors.accent, fontSize: SIZES.bodyFontSizePt }}>
        {t('dev.openLink')}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacingPt,
    gap: SIZES.spacingPt,
  },
  title: {
    fontSize: SIZES.valueFontSizePt,
    fontWeight: 'bold',
  },
  placeholder: {
    fontSize: SIZES.bodyFontSizePt,
    textAlign: 'center',
  },
});
