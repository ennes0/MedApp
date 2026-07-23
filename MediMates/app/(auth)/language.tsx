/**
 * Language Selection — one-time screen before onboarding.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { applyLanguage } from '@/src/i18n';
import { saveLanguagePreference } from '@/src/i18n/preferences';
import type { AppLanguage } from '@/src/i18n/resources';

interface LanguageOption {
  id: AppLanguage;
  flag: string;
}

export default function LanguageScreen() {
  const c = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const options = useMemo<LanguageOption[]>(
    () => [
      {
        id: 'en-GB',
        flag: '🇬🇧',
      },
      {
        id: 'en-US',
        flag: '🇺🇸',
      },
      {
        id: 'tr',
        flag: '🇹🇷',
      },
    ],
    [],
  );

  const handleChooseLanguage = async (language: AppLanguage) => {
    try {
      setIsSaving(true);
      await saveLanguagePreference(language);
      await applyLanguage(language);
      router.replace('/(auth)/onboarding');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}> 
      <MotiView
        from={{ opacity: 0, translateY: 24 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.content}
      >
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('languagePicker.minimalTitle')}</Text>

        <View style={styles.optionsWrap}>
          {options.map((option, index) => {
            return (
              <MotiView
                key={option.id}
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 100 + index * 70 }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isSaving}
                  onPress={() => handleChooseLanguage(option.id)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: c.surface,
                      borderColor: c.border,
                    },
                    shadows.none,
                  ]}
                >
                  <Text style={styles.flag}>{option.flag}</Text>
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </View>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.sizes.title1,
    fontWeight: '800',
    marginBottom: spacing.xl,
  },
  optionsWrap: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  option: {
    width: 86,
    height: 86,
    borderRadius: radii.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flag: {
    fontSize: 38,
  },
});
