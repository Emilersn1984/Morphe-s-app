/**
 * i18n — cahier-des-charges.md §2.1 : 5 langues (FR, EN, ES, IT, DE).
 * Détection de la langue du téléphone via expo-localization, changement à
 * chaud via react-i18next (guidelines-de-developpement.md §1.5 : aucun texte
 * visible codé en dur, tout passe par les fichiers de traduction).
 */
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const DEFAULT_LANGUAGE: SupportedLanguageCode = 'en';

function detectDeviceLanguage(): SupportedLanguageCode {
  const deviceLanguageCode = getLocales()[0]?.languageCode ?? DEFAULT_LANGUAGE;
  const isSupported = SUPPORTED_LANGUAGES.some((language) => language.code === deviceLanguageCode);
  return isSupported ? (deviceLanguageCode as SupportedLanguageCode) : DEFAULT_LANGUAGE;
}

// eslint-disable-next-line import/no-named-as-default-member -- `i18next.use` (pas le hook React `use`).
void i18next.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
    it: { translation: it },
    de: { translation: de },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18next;
