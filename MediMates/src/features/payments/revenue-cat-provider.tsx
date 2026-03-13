/**
 * RevenueCat Provider — Initializes RevenueCat SDK for Apple IAP.
 *
 * Configures Purchases with the public iOS API key.
 * Must wrap the app before any purchase calls are made.
 */

import React, { useEffect, useRef } from 'react';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import type { ProEntitlement } from '@/src/types/firebase';

const RC_API_KEY_IOS = 'appl_KUQKnMWaXzmqKosTzHwBpKopFGe';

/** RevenueCat entitlement identifier (must match RC dashboard) */
const RC_ENTITLEMENT = 'MedMates Pro';

const RC_PRODUCTS = {
  monthly: 'com.medmates.pro.monthly',
  yearly: 'com.medmates.pro.yearly',
};

/** Check if the RevenueCat native module is linked (false in old builds). */
function isNativeModuleAvailable(): boolean {
  try {
    Purchases.isConfigured();
    return true;
  } catch {
    return false;
  }
}

function isAnonymousAppUserId(appUserId: string | null | undefined): boolean {
  return !!appUserId && appUserId.startsWith('$RCAnonymousID:');
}

async function safeLogOutRevenueCat(): Promise<void> {
  try {
    const appUserId = await Purchases.getAppUserID();
    if (isAnonymousAppUserId(appUserId)) return;
    await Purchases.logOut();
  } catch (e) {
    console.warn('[RevenueCat] logOut error:', e);
  }
}

/** Derive pro entitlement from RevenueCat CustomerInfo */
function deriveProFromCustomerInfo(info: CustomerInfo): ProEntitlement {
  const entitlement = info.entitlements.active[RC_ENTITLEMENT];

  if (!entitlement) {
    return { active: false, plan: null, expiresAt: null };
  }

  const productId = entitlement.productIdentifier;
  let plan: 'monthly' | 'yearly' | null = null;
  if (productId === RC_PRODUCTS.monthly) plan = 'monthly';
  else if (productId === RC_PRODUCTS.yearly) plan = 'yearly';

  const expiresAt = entitlement.expirationDate
    ? Timestamp.fromDate(new Date(entitlement.expirationDate))
    : null;

  return { active: true, plan, expiresAt };
}

interface Props {
  children: React.ReactNode;
}

export function RevenueCatProvider({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const ready = useRef(false);
  const rcUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativeModuleAvailable()) {
      console.warn('[RevenueCat] Native module not available — rebuild required.');
      return;
    }

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
    }

    Purchases.configure({ apiKey: RC_API_KEY_IOS });
    ready.current = true;
  }, []);

  // Sync RevenueCat user ID with Firebase UID.
  // On logout (user becomes null) reset to anonymous so the next
  // account on the same device doesn't inherit entitlements.
  // Also performs initial pro status sync on login.
  useEffect(() => {
    if (!ready.current) return;

    const syncProStatus = async (uid: string) => {
      try {
        // Get current entitlements from RevenueCat
        const customerInfo = await Purchases.getCustomerInfo();
        const pro = deriveProFromCustomerInfo(customerInfo);
        const currentPro = useAuthStore.getState().user?.pro;

        // Keep local + Firestore in sync with RevenueCat for the currently logged in user.
        const changed =
          currentPro?.active !== pro.active ||
          currentPro?.plan !== pro.plan ||
          (currentPro?.expiresAt?.toMillis?.() ?? null) !==
            (pro.expiresAt?.toMillis?.() ?? null);

        if (changed) {
          useAuthStore.getState().updatePro(pro);
          try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, { pro, updatedAt: Timestamp.now() });
          } catch (e) {
            console.warn('[RevenueCat] Failed to sync pro to Firestore:', e);
          }
        }
      } catch (e) {
        console.warn('[RevenueCat] Failed to get customer info:', e);
      }
    };

    if (user?.uid) {
      const uid = user.uid;

      // If user changed without an intermediate null state, force a clean RC session.
      const switchedUser =
        rcUserIdRef.current && rcUserIdRef.current !== uid;

      (async () => {
        try {
          if (switchedUser) {
            await safeLogOutRevenueCat();
          }

          await Purchases.logIn(uid);
          rcUserIdRef.current = uid;
          await syncProStatus(uid);
        } catch (e) {
          console.warn('[RevenueCat] identity sync error:', e);
        }
      })();
    } else {
      rcUserIdRef.current = null;
      void safeLogOutRevenueCat();
    }
  }, [user?.uid]);

  // Listen for entitlement changes (expiry, cancellation, renewal)
  useEffect(() => {
    if (!ready.current || !user?.uid) return;

    const listener = async (info: CustomerInfo) => {
      const pro = deriveProFromCustomerInfo(info);
      const currentPro = useAuthStore.getState().user?.pro;

      // Only update if status actually changed
      if (currentPro?.active !== pro.active || currentPro?.plan !== pro.plan) {
        useAuthStore.getState().updatePro(pro);
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { pro, updatedAt: Timestamp.now() });
        } catch {
          // Firestore sync failed — local state is still correct
        }
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, [user?.uid]);

  return <>{children}</>;
}
