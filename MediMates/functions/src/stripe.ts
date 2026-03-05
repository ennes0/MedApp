/**
 * Stripe Cloud Functions — checkout, cancel, restore.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

function getStripe() {
  return new Stripe(stripeSecretKey.value().trim(), {
    apiVersion: '2023-10-16',
  });
}

// Price IDs from Stripe Dashboard
const PRICE_IDS: Record<string, string> = {
  monthly: 'price_1T6zcKJtf3D1X7GRAEJ6EEYq',  // $2.99/month
  yearly: 'price_1T6zchJtf3D1X7GRRgnK5FEv',   // $23.99/year ($1.99/mo)
};

/**
 * Create a checkout session for the calling user.
 * Returns clientSecret, customerId, ephemeralKey for PaymentSheet.
 */
export const createCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');

  const { plan } = request.data as { plan: string };
  if (!PRICE_IDS[plan]) throw new HttpsError('invalid-argument', 'Invalid plan');

  const stripe = getStripe();

  // Get or create Stripe customer
  const userDoc = await db.doc(`users/${uid}`).get();
  const userData = userDoc.data();
  let customerId = userData?.pro?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { firebaseUid: uid },
      email: userData?.email ?? undefined,
      name: userData?.displayName ?? undefined,
    });
    customerId = customer.id;
    await db.doc(`users/${uid}`).update({
      'pro.stripeCustomerId': customerId,
    });
  }

  // Create subscription with pending payment
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: PRICE_IDS[plan] }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: { firebaseUid: uid, plan },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  // Create ephemeral key for PaymentSheet
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: '2023-10-16' },
  );

  return {
    clientSecret: paymentIntent.client_secret,
    customerId,
    ephemeralKey: ephemeralKey.secret,
    subscriptionId: subscription.id,
  };
});

/**
 * Cancel an active subscription.
 */
export const cancelSubscription = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');

  const { subscriptionId } = request.data as { subscriptionId: string };
  if (!subscriptionId)
    throw new HttpsError('invalid-argument', 'Missing subscriptionId');

  // Verify ownership
  const userDoc = await db.doc(`users/${uid}`).get();
  const userData = userDoc.data();
  if (userData?.pro?.stripeSubscriptionId !== subscriptionId) {
    throw new HttpsError('permission-denied', 'Not your subscription');
  }

  const stripe = getStripe();

  // Cancel at period end
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return { success: true };
});

/**
 * Restore / verify subscription status.
 */
export const restoreSubscription = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');

  const userDoc = await db.doc(`users/${uid}`).get();
  const userData = userDoc.data();
  const customerId = userData?.pro?.stripeCustomerId;

  if (!customerId) return { pro: null };

  const stripe = getStripe();

  // Check active subscriptions
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  if (subs.data.length === 0) return { pro: null };

  const activeSub = subs.data[0];
  const plan = (activeSub.metadata.plan ?? 'monthly') as 'monthly' | 'yearly';

  const pro = {
    active: true,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: activeSub.id,
    expiresAt: admin.firestore.Timestamp.fromMillis(
      activeSub.current_period_end * 1000,
    ),
  };

  // Update Firestore
  await db.doc(`users/${uid}`).update({ pro });

  return { pro };
});
