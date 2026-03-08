/**
 * useProGate — Centralized pro tier enforcement hook
 *
 * Free tier limits:
 * - 1 medication maximum
 * - 1 reminder (only for that 1 med)
 * - No Mates / Chat access
 * - No analytics
 * - No PDF export
 *
 * Pro tier: all features unlocked.
 */

import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/stores/auth-store';
import { useMeds } from '@/src/features/meds/hooks/use-meds';

/* ── Tier constants ── */
export const FREE_MED_LIMIT = 1;

/* ── Hook ── */
export function useProGate() {
  const user = useAuthStore((s) => s.user);
  const { data: meds = [] } = useMeds();
  const router = useRouter();

  const isPro = user?.pro?.active ?? false;
  const medCount = meds.length;

  const canAddMed = useMemo(
    () => isPro || medCount < FREE_MED_LIMIT,
    [isPro, medCount],
  );

  const canUseMates = isPro;
  const canUseAnalytics = isPro;
  const canExportPDF = isPro;

  /** Show paywall alert and navigate to paywall */
  const promptUpgrade = (feature?: string) => {
    const desc = feature
      ? `${feature} is a Pro feature. Upgrade to unlock unlimited medications, mates, analytics, and PDF exports.`
      : 'This feature requires a Pro subscription.';

    Alert.alert('Pro Required', desc, [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'See Plans',
        onPress: () => router.push('/paywall'),
      },
    ]);
  };

  /** Guard for adding medications */
  const guardAddMed = (): boolean => {
    if (canAddMed) return true;
    promptUpgrade('Adding more medications');
    return false;
  };

  /** Guard for Mates tab */
  const guardMates = (): boolean => {
    if (canUseMates) return true;
    promptUpgrade('MedMates matching');
    return false;
  };

  /** Guard for analytics */
  const guardAnalytics = (): boolean => {
    if (canUseAnalytics) return true;
    promptUpgrade('Analytics');
    return false;
  };

  /** Guard for PDF export */
  const guardExport = (): boolean => {
    if (canExportPDF) return true;
    promptUpgrade('PDF Export');
    return false;
  };

  return {
    isPro,
    medCount,
    canAddMed,
    canUseMates,
    canUseAnalytics,
    canExportPDF,
    promptUpgrade,
    guardAddMed,
    guardMates,
    guardAnalytics,
    guardExport,
  };
}
