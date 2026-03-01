/**
 * Step 1 — Medication Type & Name
 *
 * User selects the medication form (tablet, capsule, liquid, etc.)
 * and enters the medication name. The form selection auto-sets
 * the icon and influences which units/routes appear in Step 2.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { AppTextInput as TextInput } from '@/src/design-system/components/text-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MEDICATION_FORMS, IMAGE_FOR_FORM } from '../../types';
import type { AddMedStep1 } from '../../types';
import type { MedicationForm } from '@/src/types/firebase';

interface Props {
  control: Control<AddMedStep1>;
  errors: FieldErrors<AddMedStep1>;
}

export function StepMedicationType({ control, errors }: Props) {
  const c = useColors();

  return (
    <View>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        What are you taking?
      </Text>
      <Text style={[styles.stepSub, { color: c.textSecondary }]}>
        Select the medication form and enter its name.
      </Text>

      {/* Medication Name */}
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <TextInput
            label="Medication Name"
            placeholder="e.g. Ibuprofen, Vitamin D, Metformin"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={error?.message}
            autoFocus
          />
        )}
      />

      {/* Medication Form Grid */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        Medication Form
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
