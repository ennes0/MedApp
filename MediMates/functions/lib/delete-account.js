"use strict";
/**
 * deleteUserAccount — Cloud Function that fully deletes a user's account.
 *
 * Deletes:
 * 1. All subcollections under userMeds/{uid} (items, dayLogs)
 * 2. The userMeds/{uid} document itself
 * 3. All medMatches where the user is a participant
 * 4. All likes (from or to the user)
 * 5. All pairs the user is in + their messages
 * 6. All chats the user is in
 * 7. All blocks by or against the user
 * 8. Chat consent
 * 9. The user profile document (users/{uid})
 * 10. Stripe subscription cancellation (if active)
 * 11. Firebase Auth account deletion
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
exports.deleteUserAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const authAdmin = admin.auth();
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
function getStripe() {
    return new stripe_1.default(stripeSecretKey.value().trim(), {
        apiVersion: '2023-10-16',
    });
}
/**
 * Recursively delete all documents in a collection.
 */
async function deleteCollection(collectionRef, batchSize = 100) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty)
        return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    // Recurse if there are more
    if (snapshot.size >= batchSize) {
        await deleteCollection(collectionRef, batchSize);
    }
}
/**
 * Delete all documents in a query result.
 */
async function deleteQueryResults(querySnap) {
    if (querySnap.empty)
        return;
    const batchSize = 100;
    let batch = db.batch();
    let count = 0;
    for (const docSnap of querySnap.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count >= batchSize) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
}
exports.deleteUserAccount = (0, https_1.onCall)({ secrets: [stripeSecretKey], timeoutSeconds: 120 }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in');
    console.log(`[deleteUserAccount] Starting deletion for user: ${uid}`);
    try {
        // ── 1. Cancel Stripe subscription if active ──
        const userDoc = await db.doc(`users/${uid}`).get();
        const userData = userDoc.data();
        if (userData?.pro?.stripeSubscriptionId) {
            try {
                const stripe = getStripe();
                await stripe.subscriptions.cancel(userData.pro.stripeSubscriptionId);
                console.log(`[deleteUserAccount] Cancelled Stripe subscription: ${userData.pro.stripeSubscriptionId}`);
            }
            catch (err) {
                console.warn('[deleteUserAccount] Stripe cancellation failed (may already be cancelled):', err);
            }
        }
        // ── 2. Delete userMeds subcollections ──
        const medsItemsRef = db.collection(`userMeds/${uid}/items`);
        await deleteCollection(medsItemsRef);
        console.log('[deleteUserAccount] Deleted medications');
        const dayLogsRef = db.collection(`userMeds/${uid}/dayLogs`);
        await deleteCollection(dayLogsRef);
        console.log('[deleteUserAccount] Deleted day logs');
        // Delete the userMeds parent doc if it exists
        try {
            await db.doc(`userMeds/${uid}`).delete();
        }
        catch { /* may not exist as a document */ }
        // ── 3. Expire medMatches where user is participant (update to 'expired' so onMedMatchChanged can update mateCount) ──
        const matchesSnap = await db.collection('medMatches')
            .where('uids', 'array-contains', uid)
            .get();
        // First expire the matches so the surviving user's mateCount is decremented
        const expireBatch = db.batch();
        for (const matchDoc of matchesSnap.docs) {
            expireBatch.update(matchDoc.ref, {
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                expiredReason: 'account_deleted',
            });
        }
        if (!matchesSnap.empty) {
            await expireBatch.commit();
            // Wait a moment for onMedMatchChanged triggers to process
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        // Now delete the matches and their messages
        for (const matchDoc of matchesSnap.docs) {
            const messagesRef = matchDoc.ref.collection('messages');
            await deleteCollection(messagesRef);
        }
        await deleteQueryResults(matchesSnap);
        console.log(`[deleteUserAccount] Expired and deleted ${matchesSnap.size} med matches`);
        // ── 4. Delete likes ──
        const likesFromSnap = await db.collection('likes')
            .where('fromUid', '==', uid)
            .get();
        await deleteQueryResults(likesFromSnap);
        const likesToSnap = await db.collection('likes')
            .where('toUid', '==', uid)
            .get();
        await deleteQueryResults(likesToSnap);
        console.log(`[deleteUserAccount] Deleted likes`);
        // ── 5. Delete pairs + their messages ──
        const pairsSnap = await db.collection('pairs')
            .where('uids', 'array-contains', uid)
            .get();
        for (const pairDoc of pairsSnap.docs) {
            const messagesRef = pairDoc.ref.collection('messages');
            await deleteCollection(messagesRef);
        }
        await deleteQueryResults(pairsSnap);
        console.log(`[deleteUserAccount] Deleted ${pairsSnap.size} pairs`);
        // ── 6. Delete chats ──
        const chatsSnap = await db.collection('chats')
            .where('members', 'array-contains', uid)
            .get();
        await deleteQueryResults(chatsSnap);
        console.log(`[deleteUserAccount] Deleted ${chatsSnap.size} chats`);
        // ── 7. Delete blocks ──
        const blocksFromSnap = await db.collection('blocks')
            .where('blockerUid', '==', uid)
            .get();
        await deleteQueryResults(blocksFromSnap);
        const blocksToSnap = await db.collection('blocks')
            .where('blockedUid', '==', uid)
            .get();
        await deleteQueryResults(blocksToSnap);
        console.log('[deleteUserAccount] Deleted blocks');
        // ── 8. Delete chat consent ──
        try {
            await db.doc(`chatConsents/${uid}`).delete();
        }
        catch { /* may not exist */ }
        // ── 9. Delete reports by this user ──
        const reportsSnap = await db.collection('reports')
            .where('reporterId', '==', uid)
            .get();
        await deleteQueryResults(reportsSnap);
        // ── 10. Delete user profile ──
        await db.doc(`users/${uid}`).delete();
        console.log('[deleteUserAccount] Deleted user profile');
        // ── 11. Delete Firebase Auth account ──
        await authAdmin.deleteUser(uid);
        console.log('[deleteUserAccount] Deleted Firebase Auth account');
        console.log(`[deleteUserAccount] ✅ Complete deletion for user: ${uid}`);
        return { success: true };
    }
    catch (error) {
        console.error('[deleteUserAccount] Error:', error);
        throw new https_1.HttpsError('internal', 'Failed to delete account. Please try again.');
    }
});
//# sourceMappingURL=delete-account.js.map