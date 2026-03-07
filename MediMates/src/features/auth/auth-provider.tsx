/**
 * Auth Provider — Firebase Auth with Apple, Google & Email/Password
 *
 * Listens to onAuthStateChanged, syncs with Zustand auth-store,
 * creates/fetches Firestore user profile.
 */

import React, { useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  OAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth, db } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import type { UserProfile } from '@/src/types/firebase';

// Needed so the browser redirect completes on iOS
WebBrowser.maybeCompleteAuthSession();

// ──────────────────────────────────────────────
// Provider component
// ──────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    setLoading(true);
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous snapshot listener
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // First login — create profile
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? 'User',
              nickname: (() => {
                const base = (firebaseUser.displayName ?? 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
                return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
              })(),
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              bio: '',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              socialOptIn: false,
              socialVisible: false,
              onboardingComplete: false,
              pro: {
                active: false,
                plan: null,
                expiresAt: null,
              },
              badges: [{ type: 'newcomer', earnedAt: Timestamp.now() }],
              mateCount: 0,
              memberSince: Timestamp.now(),
              suspended: false,
              suspendedAt: null,
              blockList: [],
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          } else {
            setUser(userDoc.data() as UserProfile);
          }

          // Start realtime listener for user profile changes
          // This ensures pro status updates (from Stripe webhook) are picked up instantly
          unsubscribeSnapshot = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              setUser(snap.data() as UserProfile);
            }
          });
        } catch (error) {
          console.error('[Auth] Error fetching user profile:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [setUser, setLoading]);

  return <>{children}</>;
}

// ──────────────────────────────────────────────
// Auth actions (can be called from anywhere)
// ──────────────────────────────────────────────

/** Sign in with Apple */
export async function signInWithApple(): Promise<void> {
  try {
    console.log('[Auth] Starting Apple Sign-In...');

    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign-In failed — no identity token received.');
    }

    const oAuthCredential = new OAuthProvider('apple.com').credential({
      idToken: credential.identityToken,
      rawNonce,
    });

    const result = await signInWithCredential(auth, oAuthCredential);

    // Apple only returns the name on first sign-in — persist it to Firebase Auth + Firestore
    if (credential.fullName?.givenName) {
      const fullName = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(' ');

      // Update Firebase Auth displayName
      if (!result.user.displayName) {
        await updateProfile(result.user, { displayName: fullName });
      }

      // Also update Firestore user doc (onAuthStateChanged may have already created it with "User")
      try {
        const userDocRef = doc(db, 'users', result.user.uid);
        await setDoc(userDocRef, { displayName: fullName, updatedAt: Timestamp.now() }, { merge: true });
      } catch (e) {
        console.warn('[Auth] Could not update Firestore displayName from Apple:', e);
      }
    }

    console.log('[Auth] Apple Sign-In successful');
  } catch (error: any) {
    console.error('[Auth] Apple Sign-In error:', error);
    throw error;
  }
}

/** Sign in with Google */
export async function signInWithGoogle(idToken: string): Promise<void> {
  try {
    console.log('[Auth] Starting Google Sign-In...');
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);

    // Update Firestore doc with Google displayName if the doc has "User"
    if (result.user.displayName) {
      try {
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.displayName === 'User') {
          await setDoc(
            userDocRef,
            { displayName: result.user.displayName, updatedAt: Timestamp.now() },
            { merge: true },
          );
        }
      } catch (e) {
        console.warn('[Auth] Could not update Firestore displayName from Google:', e);
      }
    }

    console.log('[Auth] Google Sign-In successful');
  } catch (error: any) {
    console.error('[Auth] Google Sign-In error:', error);
    throw error;
  }
}

/** Create account with email & password */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  try {
    console.log('[Auth] Creating email account...');
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    console.log('[Auth] Email sign-up successful');
  } catch (error: any) {
    console.error('[Auth] Email sign-up error:', error);
    throw error;
  }
}

/** Sign in with email & password */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<void> {
  try {
    console.log('[Auth] Signing in with email...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('[Auth] Email sign-in successful');
  } catch (error: any) {
    console.error('[Auth] Email sign-in error:', error);
    throw error;
  }
}

/** Send password reset email */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/** Sign out */
export async function signOut(): Promise<void> {
  useAuthStore.getState().clear();
  await firebaseSignOut(auth);
}

/** Update user profile in Firestore + store */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await setDoc(
    userDocRef,
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true },
  );

  const currentUser = useAuthStore.getState().user;
  if (currentUser) {
    useAuthStore.getState().setUser({ ...currentUser, ...updates });
  }
}
