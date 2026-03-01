/**
 * Firebase initialization
 *
 * Replace placeholder values with your Firebase project config.
 * For production, use environment variables via expo-constants.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────

const firebaseConfig = {
  apiKey: 'AIzaSyA-eZvNMzYvtq1L3sU86fCsRU-KOHxZAQg',
  authDomain: 'medimates-517c3.firebaseapp.com',
  projectId: 'medimates-517c3',
  storageBucket: 'medimates-517c3.firebasestorage.app',
  messagingSenderId: '645379117153',
  appId: '1:645379117153:ios:464592c409431c31f19a20',
};

// ──────────────────────────────────────────────
// Initialization (singleton — safe for hot reload)
// ──────────────────────────────────────────────

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth — safe re-init guard
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  // Already initialized (hot reload) — reuse existing
  auth = getAuth(app);
}
export { auth };

// Firestore — safe re-init guard
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  // Already initialized (hot reload) — reuse existing
  db = getFirestore(app);
}
export { db };

// Storage
export const storage = getStorage(app);

// Cloud Functions
export const functions = getFunctions(app);

export { app };
