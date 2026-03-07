/**
 * useSubscription — RevenueCat (Apple IAP) subscription management hook.
 *
 * Flow:
 * 1. User picks a plan (monthly / yearly)
 * 2. `purchase(plan)` triggers Apple's native purchase sheet via RevenueCat
 * 3. On success RevenueCat verifies the receipt
 * 4. We update Firestore pro entitlement + local Zustand store
 * 5. `restorePurchase()` re-syncs with Apple if re-installing / switching devices
 */

import { useState, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import Purchases, {
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUIStore } from '@/src/stores/ui-store';
import type { ProEntitlement } from '@/src/types/firebase';

/** RevenueCat entitlement identifier (must match RC dashboard) */
const RC_ENTITLEMENT = 'MedMates Pro';

/** RevenueCat product identifiers */
const RC_PRODUCTS: Record<'monthly' | 'yearly', string> = {
  monthly: 'com.medmates.pro.monthly',
  yearly: 'com.medmates.pro.yearly',
};

/* ── Helper: sync pro status to Firestore ── */
async function syncProToFirestore(
  uid: string,
  pro: ProEntitlement,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { pro, updatedAt: Timestamp.now() });
}

/* ── Helper: check current entitlements ── */
async function checkEntitlements(): Promise<{
  isActive: boolean;
  plan: 'monthly' | 'yearly' | null;
  expiresAt: Date | null;
}> {
  const info = await Purchases.getCustomerInfo();
  const entitlement = info.entitlements.active[RC_ENTITLEMENT];

  if (!entitlement) {
    return { isActive: false, plan: null, expiresAt: null };
  }

  const productId = entitlement.productIdentifier;
  let plan: 'monthly' | 'yearly' | null = null;
  if (productId === RC_PRODUCTS.monthly) plan = 'monthly';
  else if (productId === RC_PRODUCTS.yearly) plan = 'yearly';

  const expiresAt = entitlement.expirationDate
    ? new Date(entitlement.expirationDate)
    : null;

  return { isActive: true, plan, expiresAt };
}

export function useSubscription() {
  const user = useAuthStore((s) => s.user);
  const updatePro = useAuthStore((s) => s.updatePro);
  const showToast = useUIStore((s) => s.showToast);

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Purchase a subscription plan via Apple IAP (RevenueCat).
   * Returns true on success, false on failure/cancel.
   */
  const purchase = useCallback(
    async (plan: 'monthly' | 'yearly'): Promise<boolean> => {
      if (!user) {
        showToast({ type: 'error', title: 'Please sign in first' });
        return false;
      }

      setIsLoading(true);
      try {
        // Fetch available packages from RevenueCat
        const offerings = await Purchases.getOfferings();
        const packages = offerings.current?.availablePackages;

        if (!packages?.length) {
          showToast({ type: 'error', title: 'No plans available right now' });
          return false;
        }

        // Find the package matching the requested plan
        const targetProductId = RC_PRODUCTS[plan];
        const pkg = packages.find(
          (p: PurchasesPackage) => p.product.identifier === targetProductId,
        );

        if (!pkg) {
          showToast({ type: 'error', title: 'Plan not found' });
          return false;
        }

        // Trigger Apple's native payment sheet
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT];

        if (entitlement) {
          const expiresAt = entitlement.expirationDate
            ? Timestamp.fromDate(new Date(entitlement.expirationDate))
            : null;

          const pro: ProEntitlement = {
            active: true,
            plan,
            expiresAt,
          };

          // Update local state + Firestore
          updatePro(pro);
          await syncProToFirestore(user.uid, pro);
          return true;
        }

        return false;
      } catch (error: any) {
        if (error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          // User tapped cancel — do nothing
          return false;
        }
        console.error('[RevenueCat] purchase error:', error);
        showToast({ type: 'error', title: 'Purchase failed. Please try again.' });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, updatePro, showToast],
  );

  /**
   * Restore previous purchases (device transfer / re-install).
   */
  const restorePurchase = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      await Purchases.restorePurchases();
      const { isActive, plan, expiresAt } = await checkEntitlements();

      if (isActive) {
        const pro: ProEntitlement = {
          active: true,
          plan,
          expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        };

        updatePro(pro);
        await syncProToFirestore(user.uid, pro);
        showToast({ type: 'success', title: 'Subscription restored!' });
        return true;
      } else {
        showToast({ type: 'info', title: 'No active subscription found' });
        return false;
      }
    } catch (error) {
      console.error('[RevenueCat] restore error:', error);
      showToast({ type: 'error', title: 'Could not restore purchase' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, updatePro, showToast]);

  /**
   * Open the native subscription management page (Apple Settings).
   */
  const manageSubscription = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Purchases.showManageSubscriptions();
      } else {
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } catch {
      // Fallback: open Apple subscription settings URL
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
  }, []);

  return {
    isLoading,
    isPro: user?.pro?.active ?? false,
    plan: user?.pro?.plan ?? null,
    purchase,
    restorePurchase,
    manageSubscription,
  };
}
