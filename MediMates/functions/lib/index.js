"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = exports.dailyBadgeRefresh = exports.onMedMatchChanged = exports.onMessageCreated = exports.onReportCreated = exports.stripeWebhook = exports.restoreSubscription = exports.cancelSubscription = exports.createCheckoutSession = exports.onMedDeleted = exports.onMedCreated = exports.onLikeCreated = void 0;
var on_like_created_1 = require("./on-like-created");
Object.defineProperty(exports, "onLikeCreated", { enumerable: true, get: function () { return on_like_created_1.onLikeCreated; } });
var on_med_created_1 = require("./on-med-created");
Object.defineProperty(exports, "onMedCreated", { enumerable: true, get: function () { return on_med_created_1.onMedCreated; } });
var on_med_deleted_1 = require("./on-med-deleted");
Object.defineProperty(exports, "onMedDeleted", { enumerable: true, get: function () { return on_med_deleted_1.onMedDeleted; } });
var stripe_1 = require("./stripe");
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return stripe_1.createCheckoutSession; } });
Object.defineProperty(exports, "cancelSubscription", { enumerable: true, get: function () { return stripe_1.cancelSubscription; } });
Object.defineProperty(exports, "restoreSubscription", { enumerable: true, get: function () { return stripe_1.restoreSubscription; } });
var stripe_webhook_1 = require("./stripe-webhook");
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripe_webhook_1.stripeWebhook; } });
var on_report_created_1 = require("./on-report-created");
Object.defineProperty(exports, "onReportCreated", { enumerable: true, get: function () { return on_report_created_1.onReportCreated; } });
var on_message_created_1 = require("./on-message-created");
Object.defineProperty(exports, "onMessageCreated", { enumerable: true, get: function () { return on_message_created_1.onMessageCreated; } });
var badge_functions_1 = require("./badge-functions");
Object.defineProperty(exports, "onMedMatchChanged", { enumerable: true, get: function () { return badge_functions_1.onMedMatchChanged; } });
Object.defineProperty(exports, "dailyBadgeRefresh", { enumerable: true, get: function () { return badge_functions_1.dailyBadgeRefresh; } });
var delete_account_1 = require("./delete-account");
Object.defineProperty(exports, "deleteUserAccount", { enumerable: true, get: function () { return delete_account_1.deleteUserAccount; } });
//# sourceMappingURL=index.js.map