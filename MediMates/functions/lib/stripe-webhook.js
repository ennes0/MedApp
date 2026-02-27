"use strict";
/**
 * Stripe Webhook — processes subscription lifecycle events.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const stripeWebhookSecret = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
exports.stripeWebhook = (0, https_1.onRequest)({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        res.status(400).send('Missing signature');
        return;
    }
    const stripe = new stripe_1.default(stripeSecretKey.value().trim(), { apiVersion: '2023-10-16' });
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value().trim());
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).send('Invalid signature');
        return;
    }
    switch (event.type) {
        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            if (!invoice.subscription)
                break;
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            const uid = sub.metadata.firebaseUid;
            if (!uid)
                break;
            const plan = (sub.metadata.plan ?? 'monthly');
            await db.doc(`users/${uid}`).update({
                pro: {
                    active: true,
                    plan,
                    stripeCustomerId: invoice.customer,
                    stripeSubscriptionId: sub.id,
                    expiresAt: admin.firestore.Timestamp.fromMillis(sub.current_period_end * 1000),
                },
            });
            console.log(`Pro activated for ${uid} (${plan})`);
            break;
        }
        case 'customer.subscription.deleted': {
            const sub = event.data.object;
            const uid = sub.metadata.firebaseUid;
            if (!uid)
                break;
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
            const invoice = event.data.object;
            const sub = invoice.subscription
                ? await stripe.subscriptions.retrieve(invoice.subscription)
                : null;
            const uid = sub?.metadata.firebaseUid;
            if (!uid)
                break;
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
//# sourceMappingURL=stripe-webhook.js.map