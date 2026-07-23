/**
 * Step 1 — Medication Type & Name
 *
 * User selects the medication form (tablet, capsule, liquid, etc.)
 * and enters the medication name. The form selection auto-sets
 * the icon and influences which units/routes appear in Step 2.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { AppTextInput as TextInput } from '@/src/design-system/components/text-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MEDICATION_FORMS, IMAGE_FOR_FORM } from '../../types';
import type { AddMedStep1 } from '../../types';
import type { MedicationForm } from '@/src/types/firebase';
import {
  searchTrMedicationSuggestions,
  type MedicationSuggestion,
} from '@/src/features/meds/services/medication-suggestions';
import { useTranslation } from 'react-i18next';

interface Props {
  control: Control<AddMedStep1>;
  errors: FieldErrors<AddMedStep1>;
  isTurkeyUser: boolean;
  showName?: boolean;
  showForm?: boolean;
}

export function StepMedicationType({
  control,
  errors,
  isTurkeyUser,
  showName = true,
  showForm = true,
}: Props) {
  const c = useColors();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MedicationSuggestion[]>([]);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestionSourceLabel = useMemo(
    () => t('addMedSteps.name.suggestionSource'),
    [t],
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    if (!isTurkeyUser) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    setSuggestions(searchTrMedicationSuggestions(trimmedQuery));
    setIsLoadingSuggestions(false);
  }, [query, isTurkeyUser]);

  const showSuggestions = isTurkeyUser && isInputFocused && query.trim().length >= 2;

  const handlePickSuggestion = (
    suggestion: MedicationSuggestion,
    onChange: (value: string) => void,
  ) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    onChange(suggestion.name);
    setQuery(suggestion.name);
    setSuggestions([]);
    setIsInputFocused(false);
  };

  return (
    <View>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        {showName && showForm
          ? t('addMedSteps.name.titleBoth')
          : showName
            ? t('addMedSteps.name.titleOnly')
            : t('addMedSteps.form.titleOnly')}
      </Text>
      <Text style={[styles.stepSub, { color: c.textSecondary }]}>
        {showName && showForm
          ? t('addMedSteps.name.subtitleBoth')
          : showName
            ? t('addMedSteps.name.subtitleOnly')
            : t('addMedSteps.form.subtitleOnly')}
      </Text>

      {/* Medication Name */}
      {showName && (
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <View>
              <TextInput
                label={t('addMedSteps.name.label')}
                placeholder={t('addMedSteps.name.placeholder')}
                value={value}
                onChangeText={(nextValue) => {
                  onChange(nextValue);
                  setQuery(nextValue);
                }}
                onFocus={() => {
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                    blurTimeoutRef.current = null;
                  }
                  setIsInputFocused(true);
                }}
                onBlur={() => {
                  // Delay hide so taps on suggestion rows are not lost.
                  blurTimeoutRef.current = setTimeout(() => {
                    setIsInputFocused(false);
                  }, 180);
                  onBlur();
                }}
                error={error?.message}
                autoFocus
              />

              {showSuggestions && (
                <View
                  style={[
                    styles.suggestionCard,
                    {
                      backgroundColor: c.surface,
                      borderColor: c.border,
                    },
                  ]}
                >
                  <View style={styles.suggestionHeaderRow}>
                    <Text style={[styles.suggestionHeaderText, { color: c.textSecondary }]}> 
                      Suggestions from {suggestionSourceLabel}
                    </Text>
                    {isLoadingSuggestions && <ActivityIndicator size="small" color={c.primary} />}
                  </View>

                  {!isLoadingSuggestions && suggestions.length === 0 && (
                    <Text style={[styles.emptyText, { color: c.textTertiary }]}>{t('addMedSteps.name.noSuggestions')}</Text>
                  )}

                  <ScrollView
                    style={styles.suggestionList}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator
                  >
                    {suggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={`${suggestion.source}-${suggestion.name}-${suggestion.dosage}`}
                        activeOpacity={0.75}
                        style={[styles.suggestionItem, { borderTopColor: c.borderLight }]}
                        onPress={() => handlePickSuggestion(suggestion, onChange)}
                      >
                        <Text style={[styles.suggestionText, { color: c.textPrimary }]} numberOfLines={1}>
                          {suggestion.name}
                        </Text>
                        <Text
                          style={[styles.suggestionDoseText, { color: c.textSecondary }]}
                          numberOfLines={1}
                        >
                          {suggestion.dosage || '-'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Medication Form Grid */}
      {showForm && (
        <>
          <Text style={[styles.sectionLabel, { color: c.textPrimary }]}> 
            {t('addMedSteps.form.label')}
          </Text>
          {errors.form && (
            <Text style={[styles.errorText, { color: c.error }]}> 
              {errors.form.message}
            </Text>
          )}

          <Controller
            control={control}
            name="form"
            render={({ field: { onChange, value } }) => (
              <View style={styles.formGrid}>
                {MEDICATION_FORMS.map((form) => {
                  const isSelected = value === form.id;
                  return (
                    <TouchableOpacity
                      key={form.id}
                      onPress={() => onChange(form.id)}
                      activeOpacity={0.7}
                      style={[
                        styles.formCard,
                        {
                          backgroundColor: isSelected ? c.primaryLight : c.surface,
                          borderColor: isSelected ? c.primary : c.borderLight,
                          borderWidth: isSelected ? 2 : 1,
                          ...( isSelected ? shadows.md : shadows.none),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.formIconWrap,
                          {
                            backgroundColor: isSelected ? c.primary : c.separator,
                          },
                        ]}
                      >
                        <Image
                          source={IMAGE_FOR_FORM[form.id as MedicationForm]}
                          style={styles.formIconImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text
                        style={[
                          styles.formLabel,
                          {
                            color: isSelected ? c.primary : c.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {form.label}
                      </Text>
                      {isSelected && (
                        <View style={[styles.selectedBadge, { backgroundColor: c.primary }]}> 
                          <IconSymbol name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    ...typography.sizes.title2,
    marginBottom: 4,
  },
  stepSub: {
    ...typography.sizes.body,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.sizes.headline,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.sizes.caption1,
    marginBottom: spacing.xs,
  },
  suggestionCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
    maxHeight: 240,
    zIndex: 200,
  },
  suggestionList: {
    maxHeight: 190,
  },
  suggestionHeaderRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionHeaderText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.sizes.caption1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  suggestionItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionText: {
    ...typography.sizes.body,
    fontWeight: '600',
  },
  suggestionDoseText: {
    ...typography.sizes.footnote,
    marginTop: 2,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formCard: {
    width: '30%',
    minWidth: 95,
    maxWidth: 115,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  formIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  formIconImage: {
    width: 24,
    height: 24,
  },
  formLabel: {
    ...typography.sizes.caption1,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
