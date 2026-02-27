/**
 * MediMates Cloud Functions — Entry point
 *
 * Functions:
 * 1. onLikeCreated — Detects mutual likes and creates a pair + chat
 * 2. onMedCreated — Auto-matches users who take the same medication
 * 3. createCheckoutSession — Creates a Stripe checkout for Pro subscription
 * 4. cancelSubscription — Cancels Stripe subscription
 * 5. restoreSubscription — Verifies existing subscription status
 * 6. stripeWebhook — Handles Stripe webhook events
 * 7. onReportCreated — Auto-moderation / flagging
 */

export { onLikeCreated } from './on-like-created';
export { onMedCreated } from './on-med-created';
export { createCheckoutSession, cancelSubscription, restoreSubscription } from './stripe';
export { stripeWebhook } from './stripe-webhook';
export { onReportCreated } from './on-report-created';
