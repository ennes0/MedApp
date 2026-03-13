"use strict";
/**
 * onMedCreated — Firestore trigger.
 *
 * When a user adds a new medication, automatically search for a mate
 * who takes the same medication and create a medMatch document.
 *
 * Rules:
 * - Each medication gets exactly 1 mate match
 * - Both users must have socialOptIn=true and socialVisible=true
 * - Matching is random among candidates
 * - Duplicate matches are prevented (unique per medNameKey + user pair)
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
exports.onMedCreated = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const med_match_service_1 = require("./med-match-service");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.onMedCreated = (0, firestore_1.onDocumentCreated)('userMeds/{userId}/items/{medId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const medData = snap.data();
    const userId = event.params.userId;
    const medName = medData.name;
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists)
        return;
    const userData = userDoc.data();
    const result = await (0, med_match_service_1.findOrCreateMedMatch)({
        userId,
        medication: {
            name: medName,
            form: medData.form ?? null,
            color: medData.color ?? '#007AFF',
        },
    });
    if (!result) {
        console.log(`No mate found for ${medName} (user: ${userId})`);
        return;
    }
    if (!result.created) {
        console.log(`Match already exists for ${userId} + ${medName}`);
        return;
    }
    const matchData = result.matchDoc;
    const mateUid = (matchData.uids ?? []).find((uid) => uid !== userId);
    if (!mateUid)
        return;
    const mateProfile = matchData.mateProfiles?.[mateUid] ?? {};
    console.log(`Med match created: ${userId} <-> ${mateUid} for "${medName}" (match: ${matchData.id})`);
    // Send push notification to both users about the match
    await sendMatchPushNotification(userId, mateUid, medName, userData.nickname || userData.displayName || 'Your mate', mateProfile.nickname || mateProfile.displayName || 'Your mate');
});
/**
 * Send push notifications to both matched users.
 */
async function sendMatchPushNotification(userAUid, userBUid, medName, userAName, userBName) {
    const notifications = [];
    // Get both users' push tokens
    const [userADoc, userBDoc] = await Promise.all([
        db.doc(`users/${userAUid}`).get(),
        db.doc(`users/${userBUid}`).get(),
    ]);
    const userAToken = userADoc.exists ? userADoc.data().expoPushToken : null;
    const userBToken = userBDoc.exists ? userBDoc.data().expoPushToken : null;
    const sortedUids = [userAUid, userBUid].sort();
    const matchId = `${medName.toLowerCase().trim().replace(/\s+/g, ' ')}_${sortedUids.join('_')}`;
    if (userAToken) {
        notifications.push({
            to: userAToken,
            title: `🎉 Mate Found!`,
            body: `${userBName} also takes ${medName}. Say hi!`,
            data: { type: 'mate_match', matchId },
        });
    }
    if (userBToken) {
        notifications.push({
            to: userBToken,
            title: `🎉 Mate Found!`,
            body: `${userAName} also takes ${medName}. Say hi!`,
            data: { type: 'mate_match', matchId },
        });
    }
    if (notifications.length === 0)
        return;
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notifications),
        });
    }
    catch (err) {
        console.error('[Push] sendMatchPushNotification failed:', err);
    }
}
//# sourceMappingURL=on-med-created.js.map