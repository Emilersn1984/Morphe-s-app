import deLocale from '@/src/i18n/locales/de.json';
import enLocale from '@/src/i18n/locales/en.json';
import esLocale from '@/src/i18n/locales/es.json';
import frLocale from '@/src/i18n/locales/fr.json';
import itLocale from '@/src/i18n/locales/it.json';

/** Cohérence des 5 fichiers de traduction — guidelines-de-developpement.md §5. */

type TranslationTree = { [key: string]: string | TranslationTree };

function flattenKeys(tree: TranslationTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : flattenKeys(value, path);
  });
}

const locales: Record<string, TranslationTree> = {
  fr: frLocale,
  en: enLocale,
  es: esLocale,
  it: itLocale,
  de: deLocale,
};

describe('i18n: les 5 langues ont exactement les mêmes clés', () => {
  const referenceKeys = flattenKeys(locales.en).sort();

  it('has a non-empty reference key set', () => {
    expect(referenceKeys.length).toBeGreaterThan(0);
  });

  it.each(Object.keys(locales))('locale "%s" matches the reference keys', (code) => {
    const keys = flattenKeys(locales[code]).sort();
    expect(keys).toEqual(referenceKeys);
  });
});
