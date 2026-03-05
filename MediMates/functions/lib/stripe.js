"use strict";
/**
 * Stripe Cloud Functions — checkout, cancel, restore.
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
exports.restoreSubscription = exports.cancelSubscription = exports.createCheckoutSession = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
function getStripe() {
    return new stripe_1.default(stripeSecretKey.value().trim(), {
        apiVersion: '2023-10-16',
    });
}
// Price IDs from Stripe Dashboard
const PRICE_IDS = {
    monthly: 'price_1T6zcKJtf3D1X7GRAEJ6EEYq', // $2.99/month
    yearly: 'price_1T6zchJtf3D1X7GRRgnK5FEv', // $23.99/year ($1.99/mo)
};
/**
 * Create a checkout session for the calling user.
 * Returns clientSecret, customerId, ephemeralKey for PaymentSheet.
 */
exports.createCheckoutSession = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in');
    const { plan } = request.data;
    if (!PRICE_IDS[plan])
        throw new https_1.HttpsError('invalid-argument', 'Invalid plan');
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
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;
    // Create ephemeral key for PaymentSheet
    const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: '2023-10-16' });
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
exports.cancelSubscription = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in');
    const { subscriptionId } = request.data;
    if (!subscriptionId)
        throw new https_1.HttpsError('invalid-argument', 'Missing subscriptionId');
    // Verify ownership
    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    if (userData?.pro?.stripeSubscriptionId !== subscriptionId) {
        throw new https_1.HttpsError('permission-denied', 'Not your subscription');
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
exports.restoreSubscription = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in');
    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    const customerId = userData?.pro?.stripeCustomerId;
    if (!customerId)
        return { pro: null };
    const stripe = getStripe();
    // Check active subscriptions
    const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
    });
    if (subs.data.length === 0)
        return { pro: null };
    const activeSub = subs.data[0];
    const plan = (activeSub.metadata.plan ?? 'monthly');
    const pro = {
        active: true,
        plan,
        stripeCustomerId: customerId,
        stripeSubscriptionId: activeSub.id,
        expiresAt: admin.firestore.Timestamp.fromMillis(activeSub.current_period_end * 1000),
    };
    // Update Firestore
    await db.doc(`users/${uid}`).update({ pro });
    return { pro };
});
//# sourceMappingURL=stripe.js.map