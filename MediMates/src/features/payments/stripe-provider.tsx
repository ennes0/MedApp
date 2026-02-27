/**
 * StripeProvider wrapper — initializes Stripe for the app.
 */

import React from 'react';
import { StripeProvider as StripeRNProvider } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51MlAKbJtf3D1X7GRKXFFmJagPISiQkajgPK3v6YonyPXipqYUOSTlUzaBYAFpL6kR4lM8yK4P59h0Niw8Rvfqc0t00HuShVvIF';

const isValidKey =
  STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_') ||
  STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_');

interface Props {
  children: React.ReactNode;
}

/**
 * Wrap the app with this provider to enable Stripe PaymentSheet.
 * Skips initialization if no valid key is configured yet.
 */
export function StripeProvider({ children }: Props) {
  if (!isValidKey) {
    return <>{children}</>;
  }

  return (
    <StripeRNProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.medimates.app"
    >
      {children}
    </StripeRNProvider>
  );
}
