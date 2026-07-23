/**
 * Add Medication — comprehensive 6-step wizard.
 *
 * Step 1: Medication Name (with suggestions)
 * Step 2: Medication Form
 * Step 3: Dosage, Unit, Route, Meal Relation
 * Step 4: Schedule (frequency, times, days, cycle, start date)
 * Step 5: Duration, Reminders, Refill Tracking
 * Step 6: Review & Personalize (color, notes, summary)
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MotiView, AnimatePresence } from 'moti';
import { Camera, CameraView, type BarcodeScanningResult } from 'expo-camera';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAddMed } from '@/src/features/meds/hooks/use-meds';
import { useUIStore } from '@/src/stores/ui-store';
import { useAuthStore } from '@/src/stores/auth-store';
import { useProGate } from '@/src/features/payments/use-pro-gate';
import {
  hasSeenReviewPromptForEvent,
  markReviewPromptSeenForEvent,
  requestNativeReview,
} from '@/src/features/ratings/in-app-review';
import { findMedicationByBarcode } from '@/src/features/meds/services/medication-suggestions';
import { isBarcodeCountrySupported, resolveDeviceCountry } from '@/src/lib/device-country';
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
import { computeTreatmentEndDate } from '@/src/lib/utils';

// Step components
import { StepMedicationType } from '@/src/features/meds/components/add-steps/step-medication-type';
import { StepDosage } from '@/src/features/meds/components/add-steps/step-dosage';
import { StepSchedule } from '@/src/features/meds/components/add-steps/step-schedule';
import { StepDuration } from '@/src/features/meds/components/add-steps/step-duration';
import { StepReview } from '@/src/features/meds/components/add-steps/step-review';

const TOTAL_STEPS = 6;
const STEP_ICONS = [
  'text.cursor',
  'pill.fill',
  'scalemass.fill',
  'clock.fill',
  'hourglass',
  'checkmark.seal.fill',
] as const;

export default function AddMedScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addMed = useAddMed();
  const showToast = useUIStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<ScrollView>(null);
  const { canAddMed } = useProGate();
  const [deviceCountryCode, setDeviceCountryCode] = useState<string | null>(null);
  const [barcodeAllowed, setBarcodeAllowed] = useState(false);

  // Redirect free users who already have 1 med
  React.useEffect(() => {
    if (!canAddMed) {
      router.back();
    }
  }, [canAddMed, router]);

  React.useEffect(() => {
    let active = true;

    void (async () => {
      const result = await resolveDeviceCountry();
      if (!active) return;
      setDeviceCountryCode(result.countryCode);
      setBarcodeAllowed(isBarcodeCountrySupported(result.countryCode));
    })();

    return () => {
      active = false;
    };
  }, []);

  const isTurkeyUser = React.useMemo(() => {
    if (deviceCountryCode) return deviceCountryCode === 'TR';
    const locale = Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase() ?? '';
    return locale.startsWith('tr');
  }, [deviceCountryCode]);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [entrySheetVisible, setEntrySheetVisible] = useState(true);
  const [flowVisible, setFlowVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningLocked, setScanningLocked] = useState(false);
  const [scanFrameState, setScanFrameState] = useState<'idle' | 'error' | 'success'>('idle');
  const [scanFeedbackText, setScanFeedbackText] = useState<string | null>(null);
  const [scanElapsedSec, setScanElapsedSec] = useState(0);
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);
  const [reviewPromptMedName, setReviewPromptMedName] = useState('');
  const frameShake = useRef(new Animated.Value(0)).current;
  const scanLineProgress = useRef(new Animated.Value(0)).current;
  const STEP_LABELS = [
    t('addMed.stepName'),
    t('addMed.stepForm'),
    t('addMed.stepDosage'),
    t('addMed.stepSchedule'),
    t('addMed.stepDuration'),
    t('addMed.stepReview'),
  ] as const;

  // ── Step 1 & 2: Medication Name + Form ──
  const step1Form = useForm<AddMedStep1>({
    resolver: zodResolver(addMedStep1Schema),
    defaultValues: { name: '', form: '' },
  });

  // ── Step 3: Dosage & Instructions ──
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

  // ── Step 4: Schedule (managed state) ──
  const [schedule, setSchedule] = useState<Partial<MedSchedule>>({
    frequency: 'daily',
    times: ['08:00'],
  });

  // ── Step 5: Duration & Reminders ──
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

  // ── Step 6: Personalize ──
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
      const valid = await step1Form.trigger('name');
      if (!valid) return;
    }

    if (step === 2) {
      const valid = await step1Form.trigger('form');
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

    if (step === 3) {
      const valid = await step2Form.trigger();
      if (!valid) return;
    }

    if (step === 4) {
      // Validate schedule
      if (schedule.frequency === 'every_x_hours') {
        if (!schedule.intervalHours || schedule.intervalHours < 1) {
          showToast({ type: 'error', title: t('addMed.errors.interval') });
          return;
        }
      } else if (
        schedule.frequency !== 'as_needed' &&
        (!schedule.times || schedule.times.length === 0)
      ) {
        showToast({ type: 'error', title: t('addMed.errors.timeRequired') });
        return;
      }
      if (schedule.frequency === 'specific_days' || schedule.frequency === 'weekly') {
        if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
          showToast({ type: 'error', title: t('addMed.errors.dayRequired') });
          return;
        }
      }
      if (schedule.frequency === 'cyclical') {
        if (!schedule.cycleDaysOn || !schedule.cycleDaysOff) {
          showToast({ type: 'error', title: t('addMed.errors.cycleRequired') });
          return;
        }
      }
    }

    if (step === 5) {
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
    const today = new Date();
    const todayStartDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const normalizedSchedule = {
      ...schedule,
      startDate: schedule.startDate ?? todayStartDate,
    } as MedSchedule;

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
        schedule: normalizedSchedule,
        treatmentDuration: (() => {
          const durationType = s4.treatmentDurationType as any;
          const durationObj = {
            type: durationType,
            value: s4.treatmentDurationValue,
            endDate: s4.treatmentEndDate,
          };
          // Auto-compute concrete endDate for specific_days/weeks/months
          if (
            (durationType === 'specific_days' ||
              durationType === 'specific_weeks' ||
              durationType === 'specific_months') &&
            s4.treatmentDurationValue &&
            !s4.treatmentEndDate
          ) {
            durationObj.endDate = computeTreatmentEndDate(
              durationObj,
              normalizedSchedule.startDate,
            );
          }
          return durationObj;
        })(),
        refill: {
          enabled: s4.refillEnabled,
          currentStock: s4.refillEnabled
            ? (s4.currentStock ?? Math.max((s4.refillAt ?? 5) * 6, 30))
            : s4.currentStock,
          refillAt: s4.refillAt,
        },
        reminderEnabled: s4.reminderEnabled,
        reminderMinutesBefore: s4.reminderMinutesBefore,
        paused: false,
        notes: s5.notes ?? '',
      },
      {
        onSuccess: async (result) => {
          showToast({ type: 'success', title: t('addMed.success.added', { name: s1.name }) });

          const shouldShowFirstMedReview = Boolean(result.wasFirstMedication && user?.uid);
          if (!shouldShowFirstMedReview) {
            router.back();
            return;
          }

          const alreadyPrompted = await hasSeenReviewPromptForEvent('medication_added', user?.uid);
          if (alreadyPrompted) {
            router.back();
            return;
          }

          await markReviewPromptSeenForEvent('medication_added', user?.uid);
          setReviewPromptMedName(s1.name);
          setReviewPromptVisible(true);
        },
        onError: () => {
          showToast({ type: 'error', title: t('addMed.errors.addFailed') });
        },
      },
    );
  }, [step1Form, step2Form, step4Form, step5Form, schedule, addMed, showToast, router, t, user?.uid]);

  const handleDismissReviewPrompt = useCallback(() => {
    setReviewPromptVisible(false);
    router.back();
  }, [router]);

  const handleConfirmReviewPrompt = useCallback(async () => {
    setReviewPromptVisible(false);
    await requestNativeReview().catch(() => false);
    router.back();
  }, [router]);

  const handleStartManual = useCallback(() => {
    setEntrySheetVisible(false);
    setFlowVisible(true);
  }, []);

  const handleStartBarcodeScan = useCallback(async () => {
    const countryResult = await resolveDeviceCountry();
    const supported = isBarcodeCountrySupported(countryResult.countryCode);
    setDeviceCountryCode(countryResult.countryCode);
    setBarcodeAllowed(supported);

    if (!supported) {
      showToast({
        type: 'error',
        title: t('addMed.errors.barcodeRegionLockedTitle'),
        message: t('addMed.errors.barcodeRegionLockedBody', {
          country: countryResult.countryCode ?? t('addMed.errors.unknownCountry'),
        }),
      });
      return;
    }

    const permission = await Camera.requestCameraPermissionsAsync();

    if (!permission.granted) {
      showToast({
        type: 'error',
        title: t('addMed.errors.cameraPermission'),
      });
      return;
    }

    setEntrySheetVisible(false);
    setScanningLocked(false);
    setScanFrameState('idle');
    setScanFeedbackText(null);
    frameShake.setValue(0);
    setScannerVisible(true);
  }, [frameShake, showToast, t]);

  const triggerScanErrorFeedback = useCallback(() => {
    setScanFrameState('error');
    setScanFeedbackText(t('addMed.errors.noBarcodeMatchInline'));

    Animated.sequence([
      Animated.timing(frameShake, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(frameShake, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(frameShake, { toValue: -8, duration: 70, useNativeDriver: true }),
      Animated.timing(frameShake, { toValue: 8, duration: 70, useNativeDriver: true }),
      Animated.timing(frameShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        setScanFrameState('idle');
        setScanFeedbackText(null);
      }, 650);
    });
  }, [frameShake, t]);

  React.useEffect(() => {
    if (!scannerVisible) {
      scanLineProgress.stopAnimation();
      scanLineProgress.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineProgress, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineProgress, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
      scanLineProgress.setValue(0);
    };
  }, [scannerVisible, scanLineProgress]);

  React.useEffect(() => {
    if (!scannerVisible) {
      setScanElapsedSec(0);
      return;
    }

    setScanElapsedSec(0);
    const timer = setInterval(() => {
      setScanElapsedSec((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [scannerVisible]);

  const handleBarcodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (scanningLocked) return;

    setScanningLocked(true);

    const match = await findMedicationByBarcode(result.data);
    if (!match) {
      triggerScanErrorFeedback();
      setTimeout(() => setScanningLocked(false), 900);
      return;
    }

    setScanFrameState('success');
    setScanFeedbackText(t('addMed.success.barcodeFoundInline'));

    step1Form.setValue('name', match.name, { shouldDirty: true, shouldValidate: true });
    step1Form.setValue('form', match.form, { shouldDirty: true, shouldValidate: true });
    step2Form.setValue('dosage', match.dosageValue || match.dosage, {
      shouldDirty: true,
      shouldValidate: true,
    });
    step2Form.setValue('unit', match.unit || UNIT_OPTIONS_BY_FORM[match.form]?.[0] || '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    step2Form.setValue('doseQuantity', 1, { shouldDirty: true, shouldValidate: true });
    step2Form.setValue('route', DEFAULT_ROUTE_FOR_FORM[match.form], {
      shouldDirty: true,
      shouldValidate: true,
    });
    step2Form.setValue('mealRelation', 'no_restriction', {
      shouldDirty: true,
      shouldValidate: true,
    });

    setStep(4);
    setDirection(1);
    setScannerVisible(false);
    setFlowVisible(true);

    showToast({
      type: 'success',
      title: t('addMed.success.barcodeFoundTitle', { name: match.name }),
      message: t('addMed.success.barcodeFoundBody', {
        source:
          match.source === 'tr-local'
            ? t('addMed.success.sourceTr')
            : match.source === 'openfoodfacts-us'
              ? t('addMed.success.sourceUsOff')
              : t('addMed.success.sourceUs'),
      }),
    });
  }, [scanningLocked, showToast, step1Form, step2Form, t, triggerScanErrorFeedback]);

  // ── Progress bar (continuous) ──
  const progress = step / TOTAL_STEPS;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {!flowVisible ? (
        <View style={styles.preFlowShell}>
          <Text style={[styles.preFlowTitle, { color: c.textPrimary }]}>{t('addMed.title')}</Text>
          <Text style={[styles.preFlowSubtitle, { color: c.textSecondary }]}>{t('addMed.subtitle')}</Text>
        </View>
      ) : (
        <>
          {/* Progress indicator */}
          <View style={styles.progressArea}>
            {/* Top bar with step label */}
            <View style={styles.progressHeader}>
              <Text style={[styles.progressStepText, { color: c.textTertiary }]}>
                {t('addMed.progress', { step, total: TOTAL_STEPS })}
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
                    style={styles.dot}
                    animate={{
                      backgroundColor: isCompleted
                        ? c.success
                        : isActive
                          ? c.primary
                          : c.separator,
                      scale: isActive ? 1.2 : 1,
                    }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
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
                isTurkeyUser={isTurkeyUser}
                showName
                showForm={false}
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
              <StepMedicationType
                control={step1Form.control}
                errors={step1Form.formState.errors}
                isTurkeyUser={isTurkeyUser}
                showName={false}
                showForm
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
              <StepDosage
                control={step2Form.control}
                errors={step2Form.formState.errors}
                selectedForm={(step1Form.getValues('form') || 'tablet') as MedicationForm}
                setValue={step2Form.setValue}
              />
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
              <StepSchedule schedule={schedule} onChange={setSchedule} />
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
              <StepDuration
                control={step4Form.control}
                errors={step4Form.formState.errors}
                setValue={step4Form.setValue}
              />
            </MotiView>
          )}

          {step === 6 && (
            <MotiView
              key="step6"
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
              title={step === 1 ? t('addMed.cancel') : t('addMed.back')}
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
                title={step === TOTAL_STEPS ? t('addMed.saveMedication') : t('addMed.continue')}
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
        </>
      )}

      <Modal
        visible={entrySheetVisible && !flowVisible && !scannerVisible}
        transparent
        animationType="none"
        onRequestClose={() => router.back()}
      >
        <View style={styles.entryOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => router.back()}
          />

          <MotiView
            from={{ translateY: 88, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'timing', duration: 440 }}
            style={[styles.entryCard, { backgroundColor: c.card, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          >
            <View style={styles.entryOptionGrid}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartManual}
                style={[styles.entryOptionCard, { backgroundColor: c.primary }]}
              >
                <IconSymbol name="square.and.pencil" size={34} color="#FFFFFF" />
                <Text style={styles.entryOptionTextLight}>{t('addMed.manualEntry')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartBarcodeScan}
                disabled={!barcodeAllowed}
                style={[
                  styles.entryOptionCard,
                  {
                    backgroundColor: c.primaryLight,
                    borderColor: c.primary,
                    opacity: barcodeAllowed ? 1 : 0.55,
                  },
                ]}
              >
                <IconSymbol name={barcodeAllowed ? 'barcode.viewfinder' : 'lock.fill'} size={34} color={c.primary} />
                <Text style={[styles.entryOptionTextDark, { color: c.primary }]}>{t('addMed.scanBarcode')}</Text>
                {!barcodeAllowed && (
                  <Text style={[styles.entryOptionLockedHint, { color: c.textSecondary }]}>
                    {t('addMed.barcodeLockedHint')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </MotiView>
        </View>
      </Modal>

      <View
        pointerEvents={scannerVisible ? 'auto' : 'none'}
        style={[
          styles.scannerModalHost,
          { opacity: scannerVisible ? 1 : 0 },
        ]}
      >
        <MotiView
          style={StyleSheet.absoluteFill}
          from={{ opacity: 0 }}
          animate={{ opacity: scannerVisible ? 1 : 0 }}
          transition={{ type: 'timing', duration: 220 }}
        >
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
            }}
            onBarcodeScanned={scannerVisible ? handleBarcodeScanned : undefined}
          />
        </MotiView>

        <View style={styles.scannerOverlay}>
          <View style={styles.scannerTopBar}>
            <Text style={styles.scannerTitle}>{t('addMed.scanBarcode')}</Text>
            <TouchableOpacity
              onPress={() => {
                setScannerVisible(false);
                setScanFrameState('idle');
                setScanFeedbackText(null);
                frameShake.setValue(0);
                if (!flowVisible) {
                  setEntrySheetVisible(true);
                }
              }}
              style={styles.scannerClose}
              activeOpacity={0.8}
            >
              <IconSymbol name="xmark" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.scanFrameWrap}>
            <Animated.View style={{ transform: [{ translateX: frameShake }] }}>
              <View
                style={[
                  styles.scanFrame,
                  scanFrameState === 'error' && styles.scanFrameError,
                  scanFrameState === 'success' && styles.scanFrameSuccess,
                ]}
              >
                <View style={styles.scanCounterBadge}>
                  <Text style={styles.scanCounterText}>{scanElapsedSec}s</Text>
                </View>
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanLineProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 146],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </Animated.View>
            <Text
              style={[
                styles.scannerHint,
                scanFrameState === 'error' && styles.scannerHintError,
                scanFrameState === 'success' && styles.scannerHintSuccess,
              ]}
            >
              {scanFeedbackText ?? t('addMed.scannerHint')}
            </Text>
          </View>
        </View>
      </View>

      <Modal
        visible={reviewPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissReviewPrompt}
      >
        <View style={styles.reviewOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleDismissReviewPrompt}
          />

          <View style={[styles.reviewCard, { backgroundColor: c.card }]}>
            <View style={[styles.reviewIconWrap, { backgroundColor: c.primaryLight }]}>
              <IconSymbol name="star.fill" size={28} color={c.primary} />
            </View>

            <Text style={[styles.reviewTitle, { color: c.textPrimary }]}>
              {t('inAppReview.title')}
            </Text>
            <Text style={[styles.reviewSubtitle, { color: c.textSecondary }]}>
              {t('inAppReview.subtitle', { name: reviewPromptMedName })}
            </Text>

            <View style={styles.reviewStarsRow}>
              {Array.from({ length: 5 }).map((_, index) => (
                <IconSymbol key={index} name="star.fill" size={18} color={c.primary} />
              ))}
            </View>

            <Button
              title={t('inAppReview.primaryAction')}
              onPress={handleConfirmReviewPrompt}
              size="lg"
              fullWidth
            />
            <Button
              title={t('inAppReview.secondaryAction')}
              onPress={handleDismissReviewPrompt}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        </View>
      </Modal>
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
  preFlowShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  preFlowTitle: {
    ...typography.sizes.title2,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  preFlowSubtitle: {
    ...typography.sizes.callout,
    textAlign: 'center',
  },
  entryOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  entryCard: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  entryOptionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  entryOptionCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  entryOptionTextLight: {
    color: '#FFFFFF',
    ...typography.sizes.footnote,
    fontWeight: '700',
    textAlign: 'center',
  },
  entryOptionTextDark: {
    ...typography.sizes.footnote,
    fontWeight: '700',
    textAlign: 'center',
  },
  entryOptionLockedHint: {
    ...typography.sizes.caption2,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  scannerModalHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: '#000000',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  scannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannerTitle: {
    color: '#FFFFFF',
    ...typography.sizes.title3,
  },
  scannerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrameWrap: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  scanLine: {
    width: '86%',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  scanCounterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  scanCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scanFrameError: {
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255,69,58,0.10)',
  },
  scanFrameSuccess: {
    borderColor: '#32D74B',
    backgroundColor: 'rgba(50,215,75,0.10)',
  },
  scannerHint: {
    marginTop: spacing.md,
    color: '#FFFFFF',
    ...typography.sizes.subhead,
    textAlign: 'center',
  },
  scannerHintError: {
    color: '#FFB4AF',
  },
  scannerHintSuccess: {
    color: '#B6F7C4',
  },
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  reviewCard: {
    width: '100%',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  reviewIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: {
    ...typography.sizes.title3,
    fontWeight: '800',
    textAlign: 'center',
  },
  reviewSubtitle: {
    ...typography.sizes.callout,
    textAlign: 'center',
    lineHeight: 22,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
});
