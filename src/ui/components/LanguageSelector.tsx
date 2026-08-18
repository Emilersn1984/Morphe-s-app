import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '@/src/i18n';
import { COLORS, SIZES } from '@/src/ui/theme';

/**
 * Sélecteur de langue — cahier-des-charges.md §2.1 (5 langues) et
 * plan-de-developpement.md étape 0 : « changement de langue visible ».
 */
export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = COLORS[colorScheme];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {SUPPORTED_LANGUAGES.map((language) => {
          const isActive = i18n.language === language.code;
          return (
            <Pressable
              key={language.code}
              accessibilityRole="button"
              accessibilityLabel={language.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => void changeLanguage(language.code, i18n)}
              style={[
                styles.chip,
                {
                  borderColor: colors.accent,
                  backgroundColor: isActive ? colors.accent : 'transparent',
                },
              ]}>
              <Text style={{ color: isActive ? colors.background : colors.text }}>
                {language.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function changeLanguage(code: SupportedLanguageCode, i18n: { changeLanguage: (code: string) => Promise<unknown> }) {
  return i18n.changeLanguage(code);
}

const styles = StyleSheet.create({
  container: {
    gap: SIZES.spacingPt / 2,
  },
  label: {
    fontSize: SIZES.bodyFontSizePt,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.spacingPt / 2,
  },
  chip: {
    minHeight: SIZES.minTouchTargetPt,
    paddingHorizontal: SIZES.spacingPt,
    borderRadius: SIZES.radiusPt,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
