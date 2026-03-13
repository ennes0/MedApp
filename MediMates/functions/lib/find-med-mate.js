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
exports.findMedMate = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const med_match_service_1 = require("./med-match-service");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.findMedMate = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const medId = typeof request.data?.medId === 'string' ? request.data.medId.trim() : '';
    if (!medId) {
        throw new https_1.HttpsError('invalid-argument', 'medId is required.');
    }
    const medDoc = await db.doc(`userMeds/${request.auth.uid}/items/${medId}`).get();
    if (!medDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Medication not found.');
    }
    const medData = medDoc.data();
    const result = await (0, med_match_service_1.findOrCreateMedMatch)({
        userId: request.auth.uid,
        medication: {
            name: medData.name ?? '',
            form: medData.form ?? null,
            color: medData.color ?? '#007AFF',
        },
    });
    return result?.matchDoc ?? null;
});
//# sourceMappingURL=find-med-mate.js.map