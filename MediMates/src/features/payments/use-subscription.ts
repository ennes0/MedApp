/**
 * useSubscription — Stripe subscription management hook.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUIStore } from '@/src/stores/ui-store';
import type { ProEntitlement } from '@/src/types/firebase';

interface CreateCheckoutResult {
  clientSecret: string;
  customerId: string;
  ephemeralKey: string;
}

/**
 * Hook for managing Stripe subscriptions via Firebase Cloud Functions.
 *
 * Flow:
 * 1. Call `createCheckout(plan)` → calls Cloud Function → returns Stripe client secret
 * 2. Present Stripe PaymentSheet with the client secret
 * 3. On success, Cloud Function webhook updates Firestore
 * 4. Auth store picks up the pro entitlement change via realtime listener
 */
export function useSubscription() {
  const user = useAuthStore((s) => s.user);
  const updatePro = useAuthStore((s) => s.updatePro);
  const showToast = useUIStore((s) => s.showToast);

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Step 1: Create a checkout session via Cloud Function.
   */
  const createCheckout = useCallback(
    async (plan: 'monthly' | 'yearly'): Promise<CreateCheckoutResult | null> => {
      if (!user) {
        showToast({ type: 'error', title: 'Please sign in first' });
        return null;
      }

      setIsLoading(true);
      try {
        const fn = httpsCallable<
          { plan: string },
          CreateCheckoutResult
        >(functions, 'createCheckoutSession');

        const result = await fn({ plan });
        return result.data;
      } catch (error) {
        console.error('createCheckout error:', error);
        showToast({ type: 'error', title: 'Failed to start checkout' });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, showToast],
  );

  /**
   * Cancel the current subscription.
   */
  const cancelSubscription = useCallback(async () => {
    if (!user?.pro?.stripeSubscriptionId) {
      showToast({ type: 'info', title: 'No active subscription' });
      return;
    }

    setIsLoading(true);
    try {
      const fn = httpsCallable(functions, 'cancelSubscription');
      await fn({ subscriptionId: user.pro.stripeSubscriptionId });

      updatePro({
        active: false,
        plan: null,
        stripeCustomerId: user.pro.stripeCustomerId,
        stripeSubscriptionId: null,
        expiresAt: null,
      });

      showToast({ type: 'success', title: 'Subscription cancelled' });
    } catch (error) {
      console.error('cancelSubscription error:', error);
      showToast({ type: 'error', title: 'Failed to cancel subscription' });
    } finally {
      setIsLoading(false);
    }
  }, [user, updatePro, showToast]);

  /**
   * Restore a previous subscription (verify with backend).
   */
  const restorePurchase = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const fn = httpsCallable<
        { uid: string },
        { pro: ProEntitlement } | null
      >(functions, 'restoreSubscription');

      const result = await fn({ uid: user.uid });
      if (result.data?.pro?.active) {
        updatePro(result.data.pro);
        showToast({ type: 'success', title: 'Subscription restored!' });
        return true;
      } else {
        showToast({ type: 'info', title: 'No active subscription found' });
        return false;
      }
    } catch (error) {
      console.error('restorePurchase error:', error);
      showToast({ type: 'error', title: 'Could not restore purchase' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, updatePro, showToast]);

  return {
    isLoading,
    isPro: user?.pro?.active ?? false,
    plan: user?.pro?.plan ?? null,
    createCheckout,
    cancelSubscription,
    restorePurchase,
  };
}
