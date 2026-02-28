/**
 * Add Medication — comprehensive 5-step wizard.
 *
 * Step 1: Medication Type & Name
 * Step 2: Dosage, Unit, Route, Meal Relation
 * Step 3: Schedule (frequency, times, days, cycle, start date)
 * Step 4: Duration, Reminders, Refill Tracking
 * Step 5: Review & Personalize (color, notes, summary)
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MotiView, AnimatePresence } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAddMed } from '@/src/features/meds/hooks/use-meds';
import { useUIStore } from '@/src/stores/ui-store';
import { useProGate } from '@/src/features/payments/use-pro-gate';
import {
  addMedStep1Schema,
  addMedStep2Schema,
  addMedStep4Schema,
  addMedStep5Schema,
  MED_COLORS,
  DEFAULT_ROUTE_FOR_FORM,
  ICON_FOR_FORM,
  UNIT_OPTIONS_BY_FORM,
  type AddMedStep1,
  type AddMedStep2,
  type AddMedStep4,
  type AddMedStep5,
} from '@/src/features/meds/types';
import type { MedSchedule, MedicationForm } from '@/src/types/firebase';

// Step components
import { StepMedicationType } from '@/src/features/meds/components/add-steps/step-medication-type';
import { StepDosage } from '@/src/features/meds/components/add-steps/step-dosage';
import { StepSchedule } from '@/src/features/meds/components/add-steps/step-schedule';
import { StepDuration } from '@/src/features/meds/components/add-steps/step-duration';
import { StepReview } from '@/src/features/meds/components/add-steps/step-review';

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Type', 'Dosage', 'Schedule', 'Duration', 'Review'] as const;
const STEP_ICONS = [
  'pill.fill',
  'scalemass.fill',
  'clock.fill',
  'hourglass',
  'checkmark.seal.fill',
] as const;

export default function AddMedScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addMed = useAddMed();
  const showToast = useUIStore((s) => s.showToast);
  const scrollRef = useRef<ScrollView>(null);
  const { canAddMed } = useProGate();

  // Redirect free users who already have 1 med
  React.useEffect(() => {
    if (!canAddMed) {
      router.back();
    }
  }, [canAddMed, router]);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // ── Step 1: Medication Type & Name ──
  const step1Form = useForm<AddMedStep1>({
    resolver: zodResolver(addMedStep1Schema),
    defaultValues: { name: '', form: '' },
  });

  // ── Step 2: Dosage & Instructions ──
  const step2Form = useForm<AddMedStep2>({
    resolver: zodResolver(addMedStep2Schema),
    defaultValues: {
      dosage: '',
      unit: '',
      doseQuantity: 1,
      route: '',
      mealRelation: 'no_restriction',
    },
  });

  // ── Step 3: Schedule (managed state) ──
  const [schedule, setSchedule] = useState<Partial<MedSchedule>>({
    frequency: 'daily',
    times: ['08:00'],
  });

  // ── Step 4: Duration & Reminders ──
  const step4Form = useForm<AddMedStep4>({
    resolver: zodResolver(addMedStep4Schema),
    defaultValues: {
      treatmentDurationType: 'ongoing',
      treatmentDurationValue: undefined,
      treatmentEndDate: undefined,
      reminderEnabled: true,
      reminderMinutesBefore: 0,
      refillEnabled: false,
      currentStock: undefined,
      refillAt: 5,
    },
  });

  // ── Step 5: Personalize ──
  const step5Form = useForm<AddMedStep5>({
    resolver: zodResolver(addMedStep5Schema),
    defaultValues: { color: MED_COLORS[0], notes: '' },
  });

  // ── Navigation ──
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const goNext = useCallback(async () => {
    if (step === 1) {
      const valid = await step1Form.trigger();
      if (!valid) return;
      // Auto-set defaults for step 2 based on form selection
      const selectedForm = step1Form.getValues('form') as MedicationForm;
      if (selectedForm) {
        const currentUnit = step2Form.getValues('unit');
        const currentRoute = step2Form.getValues('route');
        if (!currentUnit) {
          const units = UNIT_OPTIONS_BY_FORM[selectedForm];
          if (units?.[0]) step2Form.setValue('unit', units[0]);
        }
        if (!currentRoute) {
          step2Form.setValue('route', DEFAULT_ROUTE_FOR_FORM[selectedForm]);
        }
      }
    }

    if (step === 2) {
      const valid = await step2Form.trigger();
      if (!valid) return;
    }

    if (step === 3) {
      // Validate schedule
      if (schedule.frequency === 'every_x_hours') {
        if (!schedule.intervalHours || schedule.intervalHours < 1) {
          showToast({ type: 'error', title: 'Please set the hour interval' });
          return;
        }
      } else if (
        schedule.frequency !== 'as_needed' &&
        (!schedule.times || schedule.times.length === 0)
      ) {
        showToast({ type: 'error', title: 'Please add at least one time' });
        return;
      }
      if (schedule.frequency === 'specific_days' || schedule.frequency === 'weekly') {
        if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
          showToast({ type: 'error', title: 'Please select at least one day' });
          return;
        }
      }
      if (schedule.frequency === 'cyclical') {
        if (!schedule.cycleDaysOn || !schedule.cycleDaysOff) {
          showToast({ type: 'error', title: 'Please set cycle days on and off' });
          return;
        }
      }
    }

    if (step === 4) {
      const valid = await step4Form.trigger();
      if (!valid) return;
    }

    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
      scrollToTop();
    }
  }, [step, step1Form, step2Form, step4Form, schedule, showToast, scrollToTop]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
      scrollToTop();
    } else {
      router.back();
    }
  }, [step, router, scrollToTop]);

  const handleSubmit = useCallback(async () => {
    const valid5 = await step5Form.trigger();
    if (!valid5) return;

    const s1 = step1Form.getValues();
    const s2 = step2Form.getValues();
    const s4 = step4Form.getValues();
    const s5 = step5Form.getValues();
    const selectedForm = s1.form as MedicationForm;

    addMed.mutate(
      {
        name: s1.name,
        form: selectedForm,
        dosage: s2.dosage,
        unit: s2.unit,
        doseQuantity: s2.doseQuantity,
        route: s2.route as any,
        mealRelation: s2.mealRelation as any,
        color: s5.color,
        icon: ICON_FOR_FORM[selectedForm] ?? 'pill.fill',
        schedule: schedule as MedSchedule,
        treatmentDuration: {
          type: s4.treatmentDurationType as any,
          value: s4.treatmentDurationValue,
          endDate: s4.treatmentEndDate,
        },
        refill: {
          enabled: s4.refillEnabled,
          currentStock: s4.currentStock,
          refillAt: s4.refillAt,
        },
        reminderEnabled: s4.reminderEnabled,
        reminderMinutesBefore: s4.reminderMinutesBefore,
        paused: false,
        notes: s5.notes ?? '',
      },
      {
        onSuccess: () => {
          showToast({ type: 'success', title: `${s1.name} added!` });
          router.back();
        },
        onError: () => {
          showToast({ type: 'error', title: 'Failed to add medication' });
        },
      },
    );
  }, [step1Form, step2Form, step4Form, step5Form, schedule, addMed, showToast, router]);

  // ── Progress bar (continuous) ──
  const progress = step / TOTAL_STEPS;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Progress indicator */}
      <View style={styles.progressArea}>
        {/* Top bar with step label */}
        <View style={styles.progressHeader}>
          <Text style={[styles.progressStepText, { color: c.textTertiary }]}>
            Step {step} of {TOTAL_STEPS}
          </Text>
          <Text style={[styles.progressLabel, { color: c.textPrimary }]}>
            {STEP_LABELS[step - 1]}
          </Text>
        </View>

        {/* Animated progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: c.separator }]}>
          <MotiView
            animate={{ width: `${progress * 100}%` as any }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            style={[styles.progressFill, { backgroundColor: c.primary }]}
          />
        </View>

        {/* Step dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const isActive = i + 1 === step;
            const isCompleted = i + 1 < step;
            return (
              <MotiView
                key={i}
                animate={{
                  backgroundColor: isCompleted
                    ? c.success
                    : isActive
                      ? c.primary
                      : c.separator,
                  scale: isActive ? 1.2 : 1,
                }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                style={styles.dot}
              >
                {isCompleted ? (
                  <IconSymbol name="checkmark" size={8} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.dotText,
                      { color: isActive ? '#FFFFFF' : c.textTertiary },
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </MotiView>
            );
          })}
        </View>
      </View>

      {/* Step content */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AnimatePresence exitBeforeEnter>
          {step === 1 && (
            <MotiView
              key="step1"
              from={{ opacity: 0, translateX: direction * 60 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction * -60 }}
              transition={{ type: 'timing', duration: 250 }}
            >
              <StepMedicationType
                control={step1Form.control}
                errors={step1Form.formState.errors}
              />
            </MotiView>
          )}

          {step === 2 && (
            <MotiView
              key="step2"
              from={{ opacity: 0, translateX: direction * 60 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction * -60 }}
              transition={{ type: 'timing', duration: 250 }}
            >
              <StepDosage
                control={step2Form.control}
                errors={step2Form.formState.errors}
                selectedForm={(step1Form.getValues('form') || 'tablet') as MedicationForm}
                setValue={step2Form.setValue}
              />
            </MotiView>
          )}

          {step === 3 && (
            <MotiView
              key="step3"
              from={{ opacity: 0, translateX: direction * 60 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction * -60 }}
              transition={{ type: 'timing', duration: 250 }}
            >
              <StepSchedule schedule={schedule} onChange={setSchedule} />
            </MotiView>
          )}

          {step === 4 && (
            <MotiView
              key="step4"
              from={{ opacity: 0, translateX: direction * 60 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction * -60 }}
              transition={{ type: 'timing', duration: 250 }}
            >
              <StepDuration
                control={step4Form.control}
                errors={step4Form.formState.errors}
                setValue={step4Form.setValue}
                watch={step4Form.watch}
              />
            </MotiView>
          )}

          {step === 5 && (
            <MotiView
              key="step5"
              from={{ opacity: 0, translateX: direction * 60 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction * -60 }}
              transition={{ type: 'timing', duration: 250 }}
            >
              <StepReview
                control={step5Form.control}
                errors={step5Form.formState.errors}
                summary={{
                  name: step1Form.getValues('name'),
                  form: (step1Form.getValues('form') || 'tablet') as MedicationForm,
                  dosage: step2Form.getValues('dosage'),
                  unit: step2Form.getValues('unit'),
                  doseQuantity: step2Form.getValues('doseQuantity'),
                  route: step2Form.getValues('route') as any,
                  mealRelation: step2Form.getValues('mealRelation') as any,
                  schedule,
                  treatmentDurationType: step4Form.getValues('treatmentDurationType') as any,
                  treatmentDurationValue: step4Form.getValues('treatmentDurationValue'),
                  treatmentEndDate: step4Form.getValues('treatmentEndDate'),
                  reminderEnabled: step4Form.getValues('reminderEnabled'),
                  reminderMinutesBefore: step4Form.getValues('reminderMinutesBefore'),
                  refillEnabled: step4Form.getValues('refillEnabled'),
                  currentStock: step4Form.getValues('currentStock'),
                  refillAt: step4Form.getValues('refillAt'),
                }}
              />
            </MotiView>
          )}
        </AnimatePresence>
      </ScrollView>

      {/* Bottom actions */}
      <View
        style={[
          styles.bottomBar,
          {
            borderTopColor: c.separator,
            backgroundColor: c.background,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <Button
          title={step === 1 ? 'Cancel' : 'Back'}
          variant="ghost"
          onPress={goBack}
          style={styles.bottomBtn}
          icon={
            step > 1 ? (
              <IconSymbol name="chevron.left" size={14} color={c.primary} />
            ) : undefined
          }
        />
        <MotiView
          key={`btn-${step}`}
          from={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          <Button
            title={step === TOTAL_STEPS ? 'Save Medication' : 'Continue'}
            onPress={step === TOTAL_STEPS ? handleSubmit : goNext}
            loading={addMed.isPending}
            style={styles.bottomBtn}
            icon={
              step < TOTAL_STEPS ? (
                <IconSymbol name="chevron.right" size={14} color="#FFFFFF" />
              ) : (
                <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
              )
            }
          />
        </MotiView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStepText: {
    ...typography.sizes.caption1,
    fontWeight: '500',
  },
  progressLabel: {
    ...typography.sizes.headline,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomBtn: {
    minWidth: 130,
  },
});
