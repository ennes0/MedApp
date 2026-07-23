import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, type AppLanguage } from './resources';
import { getSavedLanguage } from './preferences';

export const DEFAULT_LANGUAGE: AppLanguage = 'en-US';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
  });
}

export async function bootstrapLanguage(): Promise<void> {
  const savedLanguage = await getSavedLanguage();
  if (savedLanguage && i18n.language !== savedLanguage) {
    await i18n.changeLanguage(savedLanguage);
  }
}

export async function applyLanguage(language: AppLanguage): Promise<void> {
  if (i18n.language === language) return;
  await i18n.changeLanguage(language);
}

export { i18n };
