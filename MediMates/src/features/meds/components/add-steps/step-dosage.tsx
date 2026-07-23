/**
 * Step 2 — Dosage & Instructions
 *
 * Strength (numeric dosage + context-aware unit), dose quantity
 * (how many per intake), route of administration, and meal relation.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Controller, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { AppTextInput as TextInput } from '@/src/design-system/components/text-input';
import { Chip } from '@/src/design-system/components/chip';
import { Card } from '@/src/design-system/components/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  UNIT_OPTIONS_BY_FORM,
  ROUTES_OF_ADMINISTRATION,
  MEAL_RELATION_OPTIONS,
  DOSE_QUANTITY_LABEL,
  type AddMedStep2,
} from '../../types';
import type { MedicationForm } from '@/src/types/firebase';
import { useTranslation } from 'react-i18next';

interface Props {
  control: Control<AddMedStep2>;
  errors: FieldErrors<AddMedStep2>;
  selectedForm: MedicationForm;
  setValue: UseFormSetValue<AddMedStep2>;
}

const QUANTITY_PRESETS = [0.5, 1, 1.5, 2, 3];

export function StepDosage({ control, errors, selectedForm, setValue }: Props) {
  const c = useColors();
  const { t } = useTranslation();

  const unitOptions = useMemo(
    () => UNIT_OPTIONS_BY_FORM[selectedForm] ?? ['mg'],
    [selectedForm],
  );

  const quantityLabel = DOSE_QUANTITY_LABEL[selectedForm] ?? 'dose(s)';

  return (
    <View>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        {t('addMedSteps.dosage.title')}
      </Text>
      <Text style={[styles.stepSub, { color: c.textSecondary }]}>
        {t('addMedSteps.dosage.subtitle')}
      </Text>

      {/* Dosage Strength */}
      <View style={styles.dosageRow}>
        <View style={{ flex: 1 }}>
          <Controller
            control={control}
            name="dosage"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <TextInput
                label={t('addMedSteps.dosage.strengthLabel')}
            
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                error={error?.message}
              />
            )}
          />
        </View>
      </View>

      {/* Unit Selection */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>{t('addMedSteps.dosage.unit')}</Text>
      <Controller
        control={control}
        name="unit"
        render={({ field: { onChange, value } }) => (
          <View style={styles.chips}>
            {unitOptions.map((u) => (
              <Chip key={u} label={u} selected={value === u} onPress={() => onChange(u)} />
            ))}
          </View>
        )}
      />
      {errors.unit && (
        <Text style={[styles.errorText, { color: c.error }]}>{errors.unit.message}</Text>
      )}

      {/* Dose Quantity */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        {t('addMedSteps.dosage.perIntake')}
      </Text>
      <Text style={[styles.sectionHint, { color: c.textTertiary }]}>
        {t('addMedSteps.dosage.perIntakeHint', { label: quantityLabel })}
      </Text>
      <Controller
        control={control}
        name="doseQuantity"
        render={({ field: { value } }) => (
          <View style={styles.quantityRow}>
            {QUANTITY_PRESETS.map((q) => {
              const isSelected = value === q;
              return (
                <TouchableOpacity
                  key={q}
                  onPress={() => setValue('doseQuantity', q)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.quantityChip,
                      {
                        backgroundColor: isSelected ? c.primary : c.surface,
                        borderColor: isSelected ? c.primary : c.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quantityText,
                        { color: isSelected ? '#FFFFFF' : c.textPrimary },
                      ]}
                    >
                      {q}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />
      {errors.doseQuantity && (
        <Text style={[styles.errorText, { color: c.error }]}>{errors.doseQuantity.message}</Text>
      )}

      {/* Route of Administration */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        {t('addMedSteps.dosage.routeTitle')}
      </Text>
      <Controller
        control={control}
        name="route"
        render={({ field: { onChange, value } }) => (
          <View style={styles.routeList}>
            {ROUTES_OF_ADMINISTRATION.map((r) => {
              const isSelected = value === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => onChange(r.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.routeCard,
                      {
                        backgroundColor: isSelected ? c.primaryLight : c.surface,
                        borderColor: isSelected ? c.primary : c.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.routeContent}>
                      <Text
                        style={[
                          styles.routeLabel,
                          {
                            color: isSelected ? c.primary : c.textPrimary,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                      >
                        {r.label}
                      </Text>
                      <Text style={[styles.routeDesc, { color: c.textTertiary }]}>
                        {r.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <IconSymbol name="checkmark.circle.fill" size={22} color={c.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      {/* Meal Relation */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        {t('addMedSteps.dosage.foodTiming')}
      </Text>
      <Controller
        control={control}
        name="mealRelation"
        render={({ field: { onChange, value } }) => (
          <View style={styles.mealGrid}>
            {MEAL_RELATION_OPTIONS.map((m) => {
              const isSelected = value === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => onChange(m.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.mealCard,
                      {
                        backgroundColor: isSelected ? c.primaryLight : c.surface,
                        borderColor: isSelected ? c.primary : c.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <IconSymbol
                      name={m.icon as any}
                      size={20}
                      color={isSelected ? c.primary : c.textTertiary}
                    />
                    <Text
                      style={[
                        styles.mealLabel,
                        {
                          color: isSelected ? c.primary : c.textPrimary,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                    <Text
                      style={[styles.mealDesc, { color: c.textTertiary }]}
                      numberOfLines={2}
                    >
                      {m.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />
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
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  sectionHint: {
    ...typography.sizes.caption1,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.sizes.caption1,
    marginTop: spacing.xs,
  },
  dosageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  quantityChip: {
    width: 52,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typography.sizes.headline,
    fontWeight: '700',
  },
  routeList: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    ...typography.sizes.subhead,
  },
  routeDesc: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mealCard: {
    width: '47%',
    minWidth: 145,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.card,
    alignItems: 'center',
    gap: 4,
  },
  mealLabel: {
    ...typography.sizes.footnote,
    fontWeight: '500',
    textAlign: 'center',
  },
  mealDesc: {
    ...typography.sizes.caption2,
    textAlign: 'center',
  },
});
