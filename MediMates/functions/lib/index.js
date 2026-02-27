"use strict";
/**
 * MediMates Cloud Functions — Entry point
 *
 * Functions:
 * 1. onLikeCreated — Detects mutual likes and creates a pair + chat
 * 2. createCheckoutSession — Creates a Stripe checkout for Pro subscription
 * 3. cancelSubscription — Cancels Stripe subscription
 * 4. restoreSubscription — Verifies existing subscription status
 * 5. stripeWebhook — Handles Stripe webhook events
 * 6. onReportCreated — Auto-moderation / flagging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReportCreated = exports.stripeWebhook = exports.restoreSubscription = exports.cancelSubscription = exports.createCheckoutSession = exports.onLikeCreated = void 0;
var on_like_created_1 = require("./on-like-created");
Object.defineProperty(exports, "onLikeCreated", { enumerable: true, get: function () { return on_like_created_1.onLikeCreated; } });
var stripe_1 = require("./stripe");
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return stripe_1.createCheckoutSession; } });
Object.defineProperty(exports, "cancelSubscription", { enumerable: true, get: function () { return stripe_1.cancelSubscription; } });
Object.defineProperty(exports, "restoreSubscription", { enumerable: true, get: function () { return stripe_1.restoreSubscription; } });
var stripe_webhook_1 = require("./stripe-webhook");
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripe_webhook_1.stripeWebhook; } });
var on_report_created_1 = require("./on-report-created");
Object.defineProperty(exports, "onReportCreated", { enumerable: true, get: function () { return on_report_created_1.onReportCreated; } });
//# sourceMappingURL=index.js.map