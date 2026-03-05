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
 * 7. onReportCreated — Enhanced auto-moderation / flagging
 * 8. onMessageCreated — Server-side content moderation for chat messages
 * 9. onMedMatchChanged — Auto badge assignment on match events
 * 10. dailyBadgeRefresh — Scheduled daily badge & mate count refresh
 * 11. onMedDeleted — Auto-expire matches when a medication is deleted
 */

export { onLikeCreated } from './on-like-created';
export { onMedCreated } from './on-med-created';
export { onMedDeleted } from './on-med-deleted';
export { createCheckoutSession, cancelSubscription, restoreSubscription } from './stripe';
export { stripeWebhook } from './stripe-webhook';
export { onReportCreated } from './on-report-created';
export { onMessageCreated } from './on-message-created';
export { onMedMatchChanged, dailyBadgeRefresh } from './badge-functions';
export { deleteUserAccount } from './delete-account';
