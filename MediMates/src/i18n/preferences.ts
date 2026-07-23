import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from './resources';

const LANGUAGE_KEY = 'medimates.language.preference.v1';
const LANGUAGE_CHOSEN_KEY = 'medimates.language.chosen.v1';

export async function getSavedLanguage(): Promise<AppLanguage | null> {
  const raw = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (!raw) return null;
  if (raw === 'en-US' || raw === 'en-GB' || raw === 'tr') return raw;
  return null;
}

export async function saveLanguagePreference(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
  await AsyncStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
}

export async function hasChosenLanguage(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(LANGUAGE_CHOSEN_KEY);
  return raw === '1';
}
