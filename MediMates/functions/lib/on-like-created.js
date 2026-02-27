"use strict";
/**
 * onLikeCreated — Firestore trigger.
 * When a like is created, check if mutual. If so, create a pair + chat doc.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLikeCreated = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.onLikeCreated = (0, firestore_1.onDocumentCreated)('likes/{likeId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const like = snap.data();
    const { fromUid, toUid } = like;
    // Check if the other person has already liked us
    const mutualQuery = await db
        .collection('likes')
        .where('fromUid', '==', toUid)
        .where('toUid', '==', fromUid)
        .limit(1)
        .get();
    if (mutualQuery.empty) {
        // No mutual like yet
        return;
    }
    // Create a canonical pair ID
    const pairId = [fromUid, toUid].sort().join('_');
    // Check if pair already exists
    const existingPair = await db.doc(`pairs/${pairId}`).get();
    if (existingPair.exists)
        return;
    const now = admin.firestore.FieldValue.serverTimestamp();
    // Create pair document
    await db.doc(`pairs/${pairId}`).set({
        id: pairId,
        uids: [fromUid, toUid].sort(),
        chatId: pairId,
        createdAt: now,
        lastMessageAt: null,
    });
    // Create chat document
    await db.doc(`chats/${pairId}`).set({
        id: pairId,
        members: [fromUid, toUid].sort(),
        memberProfiles: {},
        lastMessage: '',
        lastMessageAt: null,
        createdAt: now,
        updatedAt: now,
    });
    // Populate member profiles
    const [profile1, profile2] = await Promise.all([
        db.doc(`users/${fromUid}`).get(),
        db.doc(`users/${toUid}`).get(),
    ]);
    const profiles = {};
    if (profile1.exists) {
        const p = profile1.data();
        profiles[fromUid] = {
            displayName: p.displayName ?? 'User',
            photoURL: p.photoURL ?? null,
        };
    }
    if (profile2.exists) {
        const p = profile2.data();
        profiles[toUid] = {
            displayName: p.displayName ?? 'User',
            photoURL: p.photoURL ?? null,
        };
    }
    await db.doc(`chats/${pairId}`).update({ memberProfiles: profiles });
    // TODO: Send push notification to both users about the match
    console.log(`Match created: ${fromUid} <-> ${toUid} (pair: ${pairId})`);
});
//# sourceMappingURL=on-like-created.js.map