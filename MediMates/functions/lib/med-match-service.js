"use strict";
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
exports.normalizeMedName = normalizeMedName;
exports.findOrCreateMedMatch = findOrCreateMedMatch;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
function normalizeMedName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}
async function findOrCreateMedMatch({ userId, medication, }) {
    const medName = medication.name?.trim();
    if (!medName)
        return null;
    const medNameKey = normalizeMedName(medName);
    const medForm = medication.form ?? null;
    const medColor = medication.color ?? '#007AFF';
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists)
        return null;
    const userData = userDoc.data();
    if (!userData.socialOptIn || !userData.socialVisible)
        return null;
    if (!userData.pro?.active)
        return null;
    if (userData.suspended)
        return null;
    const existingMatch = await db
        .collection('medMatches')
        .where('uids', 'array-contains', userId)
        .where('medNameKey', '==', medNameKey)
        .where('status', '==', 'matched')
        .limit(1)
        .get();
    if (!existingMatch.empty) {
        return {
            created: false,
            matchDoc: existingMatch.docs[0].data(),
        };
    }
    const candidatesSnap = await db
        .collection('users')
        .where('socialOptIn', '==', true)
        .where('socialVisible', '==', true)
        .limit(200)
        .get();
    const userBlockList = userData.blockList ?? [];
    const candidates = candidatesSnap.docs
        .map((docSnap) => docSnap.data())
        .filter((candidate) => candidate.uid !== userId)
        .filter((candidate) => candidate.pro?.active === true)
        .filter((candidate) => !candidate.suspended)
        .filter((candidate) => {
        const theirBlockList = candidate.blockList ?? [];
        return !userBlockList.includes(candidate.uid) && !theirBlockList.includes(userId);
    });
    if (candidates.length === 0)
        return null;
    const matchCandidates = [];
    for (const candidate of candidates) {
        try {
            const medsSnap = await db
                .collection('userMeds')
                .doc(candidate.uid)
                .collection('items')
                .get();
            const hasSameMed = medsSnap.docs.some((medDoc) => normalizeMedName(medDoc.data().name ?? '') === medNameKey);
            if (!hasSameMed)
                continue;
            const candidateExisting = await db
                .collection('medMatches')
                .where('uids', 'array-contains', candidate.uid)
                .where('medNameKey', '==', medNameKey)
                .where('status', '==', 'matched')
                .limit(1)
                .get();
            if (candidateExisting.empty) {
                matchCandidates.push(candidate);
            }
        }
        catch (error) {
            console.error(`[MedMatchService] Failed candidate check for ${candidate.uid}:`, error);
        }
    }
    if (matchCandidates.length === 0)
        return null;
    const mate = matchCandidates[Math.floor(Math.random() * matchCandidates.length)];
    const sortedUids = [userId, mate.uid].sort();
    const matchId = `${medNameKey}_${sortedUids.join('_')}`;
    const matchRef = db.doc(`medMatches/${matchId}`);
    const existingById = await matchRef.get();
    if (existingById.exists) {
        return {
            created: false,
            matchDoc: existingById.data(),
        };
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    await matchRef.set({
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
                nickname: userData.nickname ?? '',
                photoURL: userData.photoURL ?? null,
                bio: userData.bio ?? '',
            },
            [mate.uid]: {
                displayName: mate.displayName ?? 'User',
                nickname: mate.nickname ?? '',
                photoURL: mate.photoURL ?? null,
                bio: mate.bio ?? '',
            },
        },
        status: 'matched',
        createdAt: now,
        lastMessageAt: null,
    });
    const createdMatch = await matchRef.get();
    return {
        created: true,
        matchDoc: createdMatch.data() ?? {
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
                    nickname: userData.nickname ?? '',
                    photoURL: userData.photoURL ?? null,
                    bio: userData.bio ?? '',
                },
                [mate.uid]: {
                    displayName: mate.displayName ?? 'User',
                    nickname: mate.nickname ?? '',
                    photoURL: mate.photoURL ?? null,
                    bio: mate.bio ?? '',
                },
            },
            status: 'matched',
            createdAt: admin.firestore.Timestamp.now(),
            lastMessageAt: null,
        },
    };
}
//# sourceMappingURL=med-match-service.js.map