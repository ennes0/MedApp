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

  // Sync RevenueCat user ID with Firebase UID
  useEffect(() => {
    if (ready.current && user?.uid) {
      Purchases.logIn(user.uid).catch((e) =>
        console.warn('[RevenueCat] logIn error:', e),
      );
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
