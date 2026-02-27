/**
 * Stripe Webhook — processes subscription lifecycle events.
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

export const stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).send('Missing signature');
    return;
  }

  const stripe = new Stripe(stripeSecretKey.value().trim(), { apiVersion: '2023-10-16' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value().trim());
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send('Invalid signature');
    return;
  }

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) break;

      const sub = await stripe.subscriptions.retrieve(
        invoice.subscription as string,
      );
      const uid = sub.metadata.firebaseUid;
      if (!uid) break;

      const plan = (sub.metadata.plan ?? 'monthly') as 'monthly' | 'yearly';

      await db.doc(`users/${uid}`).update({
        pro: {
          active: true,
          plan,
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: sub.id,
          expiresAt: admin.firestore.Timestamp.fromMillis(
            sub.current_period_end * 1000,
          ),
        },
      });

      console.log(`Pro activated for ${uid} (${plan})`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const uid = sub.metadata.firebaseUid;
      if (!uid) break;

      await db.doc(`users/${uid}`).update({
        'pro.active': false,
        'pro.stripeSubscriptionId': null,
        'pro.expiresAt': null,
        'pro.plan': null,
      });

      console.log(`Pro deactivated for ${uid}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.subscription
        ? await stripe.subscriptions.retrieve(invoice.subscription as string)
        : null;
      const uid = sub?.metadata.firebaseUid;
      if (!uid) break;

      // Optionally mark as grace period
      console.warn(`Payment failed for ${uid}`);
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  res.json({ received: true });
});
