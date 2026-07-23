/**
 * Welcome screen — direct email sign-in + prominent social login
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from '@/src/features/auth/auth-provider';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getFirebaseErrorMessage(code: string | undefined, t: (key: string) => string): string {
  switch (code) {
    case 'auth/invalid-email':
      return t('authErrors.invalidEmail');
    case 'auth/user-not-found':
      return t('authErrors.userNotFound');
    case 'auth/wrong-password':
      return t('authErrors.wrongPassword');
    case 'auth/invalid-credential':
      return t('authErrors.invalidCredential');
    case 'auth/too-many-requests':
      return t('authErrors.tooManyRequests');
    default:
      return t('authErrors.generic');
  }
}

export default function WelcomeScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const welcomeSvgUri = Image.resolveAssetSource(
    require('@/assets/images/undraw_welcome-aboard_y4e9.svg'),
  ).uri;

  const [_request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId:
      '645379117153-uom3pv2pmbc0t4v41p7ep2ndv29duvef.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setLoading('google');
      signInWithGoogle(id_token)
        .catch((error: any) => {
          Alert.alert(t('welcome.signInError'), error?.message ?? t('welcome.unknownError'));
        })
        .finally(() => setLoading(null));
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      setLoading(null);
    }
  }, [response]);

  const isLoading = loading !== null;

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('welcome.missingFieldsTitle'), t('welcome.missingFieldsMessage'));
      return;
    }
    try {
      setLoading('email');
      await signInWithEmail(email.trim(), password);
    } catch (error: any) {
      Alert.alert(t('welcome.signInError'), getFirebaseErrorMessage(error?.code, t));
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading('apple');
      await signInWithApple();
    } catch (error: any) {
      if (error?.code !== 'ERR_REQUEST_CANCELED' && error?.code !== 'ERR_CANCELED') {
        Alert.alert(t('welcome.signInError'), error?.message ?? t('welcome.unknownError'));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading('google');
      await promptAsync();
    } catch (error: any) {
      Alert.alert(t('welcome.signInError'), error?.message ?? t('welcome.unknownError'));
      setLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { backgroundColor: c.background }]}> 
          <View style={styles.heroArea}>
            <LinearGradient
              colors={[c.primary + '1F', c.primary + '08', c.background]}
              style={styles.heroGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />

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

            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600, delay: 100 }}
              style={styles.logoSection}
            >
              <View style={styles.heroIllustrationWrap}>
                <SvgUri uri={welcomeSvgUri} width="100%" height="100%" />
              </View>

              <Text style={[styles.appName, { color: c.textPrimary }]}>MedMates</Text>
              <Text style={[styles.tagline, { color: c.textSecondary }]}>{t('welcome.tagline')}</Text>
            </MotiView>
          </View>

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
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('welcome.emailLabel')}</Text>
              <View style={[styles.inputWrap, { backgroundColor: c.background, borderColor: c.border }]}> 
                <TextInput
                  style={[styles.input, { color: c.textPrimary }]}
                  placeholder={t('welcome.emailPlaceholder')}
                  placeholderTextColor={c.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('welcome.passwordLabel')}</Text>
              <View style={[styles.inputWrap, { backgroundColor: c.background, borderColor: c.border }]}> 
                <TextInput
                  style={[styles.input, { color: c.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={c.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                  <IconSymbol
                    name={showPassword ? 'eye.fill' : 'eye.slash.fill'}
                    size={18}
                    color={c.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.authBtn, styles.loginBtn, { backgroundColor: c.primary }]}
              activeOpacity={0.8}
              onPress={handleEmailSignIn}
              disabled={isLoading}
            >
              <Text style={styles.loginBtnText}>
                {loading === 'email' ? t('welcome.signingIn') : t('welcome.login')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authBtnLarge, styles.appleBtn]}
              activeOpacity={0.8}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              <IconSymbol name="apple.logo" size={22} color="#FFFFFF" />
              <Text style={styles.appleBtnText}>
                {loading === 'apple' ? t('welcome.signingIn') : t('welcome.continueApple')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authBtnLarge, styles.googleBtn, { borderColor: c.border }]}
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <FontAwesome name="google" size={20} color="#DB4437" />
              <Text style={styles.googleBtnText}> 
                {loading === 'google' ? t('welcome.signingIn') : t('welcome.continueGoogle')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authBtn, styles.signupBtn, { backgroundColor: c.borderLight }]}
              activeOpacity={0.8}
              onPress={() => router.push('/(auth)/sign-up')}
              disabled={isLoading}
            >
              <Text style={[styles.signupBtnText, { color: c.textPrimary }]}>{t('welcome.signUp')}</Text>
            </TouchableOpacity>

            <Text style={[styles.termsText, { color: c.textTertiary }]}> 
              {t('welcome.termsPrefix')}{' '}
              <Text style={styles.termsLink}>{t('welcome.terms')}</Text> &{' '}
              <Text style={styles.termsLink}>{t('welcome.privacy')}</Text>
            </Text>
          </MotiView>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  logoSection: {
    alignItems: 'center',
  },
  heroIllustrationWrap: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
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
  bottomCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.sm + 2,
  },
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.sizes.body,
    height: '100%',
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: radii.button,
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  authBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: radii.button,
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  appleBtn: {
    backgroundColor: '#000000',
  },
  appleBtnText: {
    color: '#FFFFFF',
    ...typography.sizes.callout,
    fontWeight: '700',
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  googleBtnText: {
    ...typography.sizes.callout,
    fontWeight: '700',
    color: '#111827',
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
  termsText: {
    ...typography.sizes.caption1,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
