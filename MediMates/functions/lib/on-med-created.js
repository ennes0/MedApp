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
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
function normalizeMedName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}
exports.onMedCreated = (0, firestore_1.onDocumentCreated)('userMeds/{userId}/items/{medId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const medData = snap.data();
    const userId = event.params.userId;
    const medName = medData.name;
    const medNameKey = normalizeMedName(medName);
    const medForm = medData.form ?? null;
    const medColor = medData.color ?? '#007AFF';
    // Check if the user has socialOptIn
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists)
        return;
    const userData = userDoc.data();
    if (!userData.socialOptIn || !userData.socialVisible) {
        console.log(`User ${userId} has social disabled, skipping match.`);
        return;
    }
    // Both users must be Pro
    if (!userData.pro?.active) {
        console.log(`User ${userId} is not Pro, skipping match.`);
        return;
    }
    // Suspended users cannot match
    if (userData.suspended) {
        console.log(`User ${userId} is suspended, skipping match.`);
        return;
    }
    // Check if match already exists for this med + user
    const existingMatch = await db
        .collection('medMatches')
        .where('uids', 'array-contains', userId)
        .where('medNameKey', '==', medNameKey)
        .where('status', '==', 'matched')
        .limit(1)
        .get();
    if (!existingMatch.empty) {
        console.log(`Match already exists for ${userId} + ${medNameKey}`);
        return;
    }
    // Find candidates: users with socialOptIn + socialVisible
    const candidatesSnap = await db
        .collection('users')
        .where('socialOptIn', '==', true)
        .where('socialVisible', '==', true)
        .limit(200)
        .get();
    const userBlockList = userData.blockList ?? [];
    const candidates = candidatesSnap.docs
        .map((d) => d.data())
        .filter((u) => u.uid !== userId)
        .filter((u) => u.pro?.active === true) // Both users must be Pro
        .filter((u) => !u.suspended) // Exclude suspended users
        .filter((u) => {
        // Exclude users who blocked us or whom we blocked
        const theirBlockList = u.blockList ?? [];
        return !userBlockList.includes(u.uid) && !theirBlockList.includes(userId);
    });
    if (candidates.length === 0) {
        console.log('No candidates available for matching.');
        return;
    }
    // Check each candidate for the same med
    const matchCandidates = [];
    for (const candidate of candidates) {
        try {
            const medsSnap = await db
                .collection('userMeds')
                .doc(candidate.uid)
                .collection('items')
                .get();
            const hasSameMed = medsSnap.docs.some((d) => normalizeMedName(d.data().name) === medNameKey);
            if (hasSameMed) {
                // Check candidate doesn't already have a match for this med
                const candExisting = await db
                    .collection('medMatches')
                    .where('uids', 'array-contains', candidate.uid)
                    .where('medNameKey', '==', medNameKey)
                    .where('status', '==', 'matched')
                    .limit(1)
                    .get();
                if (candExisting.empty) {
                    matchCandidates.push(candidate);
                }
            }
        }
        catch (err) {
            console.error(`Error checking meds for ${candidate.uid}:`, err);
        }
    }
    if (matchCandidates.length === 0) {
        console.log(`No mate found for ${medNameKey} (user: ${userId})`);
        return;
    }
    // Pick a random candidate
    const randomIndex = Math.floor(Math.random() * matchCandidates.length);
    const mate = matchCandidates[randomIndex];
    // Create the match
    const sortedUids = [userId, mate.uid].sort();
    const matchId = `${medNameKey}_${sortedUids.join('_')}`;
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.doc(`medMatches/${matchId}`).set({
        id: matchId,
        uids: sortedUids,
        initiatorUid: userId,
        medNameKey,
        medDisplayName: medName,
        medForm,
        medColor,
        mateProfiles: {
            [userId]: {
                displayName: userData.displayName ?? 'User',
                photoURL: userData.photoURL ?? null,
                bio: userData.bio ?? '',
            },
            [mate.uid]: {
                displayName: mate.displayName ?? 'User',
                photoURL: mate.photoURL ?? null,
                bio: mate.bio ?? '',
            },
        },
        status: 'matched',
        createdAt: now,
        lastMessageAt: null,
    });
    console.log(`Med match created: ${userId} <-> ${mate.uid} for "${medName}" (match: ${matchId})`);
    // TODO: Send push notification to both users about the match
});
//# sourceMappingURL=on-med-created.js.map