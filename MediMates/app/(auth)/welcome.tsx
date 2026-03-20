/**
 * Welcome screen — Authentication hub
 *
 * Clean, modern design with logo, social auth buttons,
 * email login/signup, and terms.
 * Inspired by modern iOS app login patterns.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri } from 'react-native-svg';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { signInWithApple, signInWithGoogle } from '@/src/features/auth/auth-provider';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const welcomeSvgUri = Image.resolveAssetSource(
    require('@/assets/images/undraw_welcome-aboard_y4e9.svg'),
  ).uri;

  // Google auth session — iosClientId must match GoogleService-Info.plist CLIENT_ID
  const [_request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: '645379117153-uom3pv2pmbc0t4v41p7ep2ndv29duvef.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    console.log('[Auth] Google auth response:', response?.type, response?.type === 'error' ? (response as any).error : '');
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleToken(id_token);
    } else if (response?.type === 'error') {
      console.error('[Auth] Google auth error:', (response as any).error);
      setLoading(null);
    } else if (response?.type === 'dismiss') {
      console.log('[Auth] Google auth dismissed by user');
      setLoading(null);
    }
  }, [response]);

  const isLoading = loading !== null;

  const handleAppleSignIn = async () => {
    try {
      setLoading('apple');
      await signInWithApple();
    } catch (error: any) {
      if (
        error?.code !== 'ERR_REQUEST_CANCELED' &&
        error?.code !== 'ERR_CANCELED'
      ) {
        Alert.alert('Sign-in Error', error?.message ?? 'Unknown error');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading('google');
      console.log('[Auth] Starting Google Sign-In via promptAsync...');
      const result = await promptAsync();
      console.log('[Auth] Google promptAsync result:', result?.type);
      // Don't clear loading here — the response useEffect handles it
    } catch (error: any) {
      console.error('[Auth] Google promptAsync error:', error);
      Alert.alert('Sign-in Error', error?.message ?? 'Unknown error');
      setLoading(null);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    try {
      setLoading('google');
      await signInWithGoogle(idToken);
    } catch (error: any) {
      Alert.alert('Sign-in Error', error?.message ?? 'Unknown error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* ── Top hero area ── */}
      <View style={styles.heroArea}>
        <LinearGradient
          colors={[c.primary + '1F', c.primary + '08', c.background]}
          style={styles.heroGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Decorative floating elements */}
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ type: 'timing', duration: 1000, delay: 200 }}
          style={[styles.decorCircle, styles.decorCircle1]}
        >
          <View style={[styles.circle, { borderColor: c.primary }]} />
        </MotiView>
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.06, scale: 1 }}
          transition={{ type: 'timing', duration: 1000, delay: 400 }}
          style={[styles.decorCircle, styles.decorCircle2]}
        >
          <View style={[styles.circleSmall, { borderColor: c.primary }]} />
        </MotiView>

        <View style={[styles.glowOrb, { backgroundColor: c.primary + '22' }]} />

        {/* Logo and app name */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 100 }}
          style={styles.logoSection}
        >
          <View style={styles.heroIllustrationWrap}>
            <SvgUri uri={welcomeSvgUri} width="100%" height="100%" />
          </View>

          <Text style={[styles.appName, { color: c.textPrimary }]}>
            MedMates
          </Text>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>
            Track your meds. Find your mates.
          </Text>
        </MotiView>
      </View>

      {/* ── Bottom card area ── */}
      <MotiView
        from={{ opacity: 0, translateY: 40 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
        style={[
          styles.bottomCard,
          {
            backgroundColor: c.surface,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        {/* Apple button */}
        <TouchableOpacity
          style={[styles.authBtn, styles.appleBtn]}
          activeOpacity={0.8}
          onPress={handleAppleSignIn}
          disabled={isLoading}
        >
          <IconSymbol name="apple.logo" size={20} color="#FFFFFF" />
          <Text style={styles.appleBtnText}>
            {loading === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          </Text>
        </TouchableOpacity>

        {/* Google button */}
        <TouchableOpacity
          style={[styles.authBtn, styles.googleBtn, { borderColor: c.border }]}
          activeOpacity={0.8}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          {loading === 'google' ? (
            <Text style={[styles.googleBtnText, { color: c.textPrimary }]}>Signing in…</Text>
          ) : (
            <Text style={[styles.googleBtnText, { color: c.textPrimary }]}>
              Continue with{' '}
              <Text style={styles.googleBlue}>G</Text>
              <Text style={styles.googleRed}>o</Text>
              <Text style={styles.googleYellow}>o</Text>
              <Text style={styles.googleBlue}>g</Text>
              <Text style={styles.googleGreen}>l</Text>
              <Text style={styles.googleRed}>e</Text>
            </Text>
          )}
        </TouchableOpacity>

        {/* Email Login button */}
        <TouchableOpacity
          style={[styles.authBtn, styles.loginBtn, { backgroundColor: c.primary }]}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/sign-in')}
          disabled={isLoading}
        >
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>

        {/* Sign Up button */}
        <TouchableOpacity
          style={[styles.authBtn, styles.signupBtn, { backgroundColor: c.borderLight }]}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/sign-up')}
          disabled={isLoading}
        >
          <Text style={[styles.signupBtnText, { color: c.textPrimary }]}>Sign up</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.termsText, { color: c.textTertiary }]}>
          By using MediMates you agree to the{' '}
          <Text style={styles.termsLink}>Terms</Text> &{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Hero
  heroArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle: {
    position: 'absolute',
  },
  decorCircle1: {
    top: '8%',
    right: -40,
  },
  decorCircle2: {
    bottom: '12%',
    left: -28,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
  },
  circleSmall: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  glowOrb: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: '20%',
  },

  // Logo
  logoSection: {
    alignItems: 'center',
  },
  heroIllustrationWrap: {
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_WIDTH * 0.78,
    marginBottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.sizes.body,
    textAlign: 'center',
  },

  // Bottom card
  bottomCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.sm + 4,
  },

  // Auth buttons
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: radii.button,
    gap: spacing.sm + 2,
  },
  appleBtn: {
    backgroundColor: '#000000',
  },
  appleBtnText: {
    color: '#FFFFFF',
    ...typography.sizes.callout,
    fontWeight: '600',
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  googleBtnText: {
    ...typography.sizes.callout,
    fontWeight: '600',
  },
  googleBlue: {
    color: '#4285F4',
    fontWeight: '700',
  },
  googleRed: {
    color: '#EA4335',
    fontWeight: '700',
  },
  googleYellow: {
    color: '#FBBC05',
    fontWeight: '700',
  },
  googleGreen: {
    color: '#34A853',
    fontWeight: '700',
  },
  loginBtn: {},
  loginBtnText: {
    color: '#FFFFFF',
    ...typography.sizes.callout,
    fontWeight: '700',
  },
  signupBtn: {},
  signupBtnText: {
    ...typography.sizes.callout,
    fontWeight: '600',
  },

  // Terms
  termsText: {
    ...typography.sizes.caption1,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 17,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
