/**
 * Sign-Up screen — card layout auth screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { SvgUri } from 'react-native-svg';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  signInWithApple,
  signInWithGoogle,
  signUpWithEmail,
} from '@/src/features/auth/auth-provider';

WebBrowser.maybeCompleteAuthSession();

const TERMS_OF_USE_URL = 'https://lavish-shirt-ecb.notion.site/MedMates-Terms-of-Use-321ca73dd79680deb2c3ed0c1e229165';

function getFirebaseErrorMessage(code: string | undefined, t: (key: string) => string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return t('authErrors.emailAlreadyInUse');
    case 'auth/invalid-email':
      return t('authErrors.invalidEmail');
    case 'auth/weak-password':
      return t('authErrors.weakPassword');
    default:
      return t('authErrors.generic');
  }
}

export default function SignUpScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const heroSvgUri = Image.resolveAssetSource(
    require('@/assets/images/undraw_welcome-aboard_y4e9.svg'),
  ).uri;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const [_request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId:
      '645379117153-uom3pv2pmbc0t4v41p7ep2ndv29duvef.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setLoading(true);
      signInWithGoogle(id_token)
        .catch((error: any) => {
          Alert.alert(t('signUp.errorTitle'), error?.message ?? t('signUp.googleFailed'));
        })
        .finally(() => setLoading(false));
    }
  }, [response, t]);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('signUp.missingFieldsTitle'), t('signUp.missingFieldsMessage'));
      return;
    }
    if (!acceptTerms) {
      Alert.alert(t('signUp.termsRequiredTitle'), t('signUp.termsRequiredMessage'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('signUp.weakPasswordTitle'), t('signUp.weakPasswordMessage'));
      return;
    }

    try {
      setLoading(true);
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (error: any) {
      Alert.alert(t('signUp.errorTitle'), getFirebaseErrorMessage(error?.code, t));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithApple();
    } catch (error: any) {
      if (error?.code !== 'ERR_REQUEST_CANCELED' && error?.code !== 'ERR_CANCELED') {
        Alert.alert(t('signUp.errorTitle'), error?.message ?? t('signUp.appleFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await promptAsync();
    } catch (error: any) {
      Alert.alert(t('signUp.errorTitle'), error?.message ?? t('signUp.googleFailed'));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <View style={[styles.backCircle, { backgroundColor: c.card, borderColor: c.border }]}> 
            <IconSymbol name="chevron.left" size={18} color={c.textPrimary} />
          </View>
        </TouchableOpacity>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.brandWrap}
        >
          <Text style={[styles.brand, { color: c.primary }]}>{t('signUp.brand')}</Text>
          <View style={styles.heroIllustrationWrap}>
            <SvgUri uri={heroSvgUri} width="100%" height="100%" />
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 150 }}
          style={[styles.card, { backgroundColor: c.card }]}
        >
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('signUp.title')}</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{t('signUp.nameLabel')}</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.borderLight }]}> 
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder={t('signUp.namePlaceholder')}
                placeholderTextColor={c.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{t('signUp.emailLabel')}</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.borderLight }]}> 
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder={t('signUp.emailPlaceholder')}
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

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{t('signUp.passwordLabel')}</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.borderLight }]}> 
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={c.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <IconSymbol
                  name={showPassword ? 'eye.fill' : 'eye.slash.fill'}
                  size={20}
                  color={c.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.termsRow}>
            <TouchableOpacity onPress={() => setAcceptTerms((v) => !v)} activeOpacity={0.8} hitSlop={8}>
            <IconSymbol
              name={acceptTerms ? 'checkmark.square.fill' : 'square'}
              size={16}
              color={acceptTerms ? c.primary : c.textTertiary}
            />
            </TouchableOpacity>
            <Text style={[styles.termsText, { color: c.textSecondary }]}>{`${t('signUp.agreePrefix')} `}</Text>
            <TouchableOpacity onPress={() => void WebBrowser.openBrowserAsync(TERMS_OF_USE_URL)} activeOpacity={0.7}>
              <Text style={[styles.termsLink, { color: c.primary }]}>{t('signUp.terms')}</Text>
            </TouchableOpacity>
          </View>

          <Button
            title={loading ? t('signUp.creatingAccount') : t('signUp.createAccount')}
            onPress={handleSignUp}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={styles.cta}
          />

          <Text style={[styles.socialLabel, { color: c.textTertiary }]}>{t('signUp.socialLabel')}</Text>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: c.surface }]}
              activeOpacity={0.75}
              onPress={handleGoogleSignIn}
            >
              <Text style={styles.googleLetter}>G</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: c.surface }]}
              activeOpacity={0.75}
              onPress={handleAppleSignIn}
            >
              <IconSymbol name="apple.logo" size={20} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/welcome')}
            activeOpacity={0.7}
            style={styles.toggleLink}
          >
            <Text style={[styles.toggleText, { color: c.textSecondary }]}>{`${t('signUp.haveAccount')} `}</Text>
            <Text style={[styles.toggleTextBold, { color: c.primary }]}>{t('signUp.signIn')}</Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.sm,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: spacing.sm,
  },
  heroIllustrationWrap: {
    width: '78%',
    aspectRatio: 1.35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.sizes.title2,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.sizes.caption1,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.sizes.body,
    height: '100%',
  },
  termsRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  termsText: {
    ...typography.sizes.footnote,
  },
  termsLink: {
    ...typography.sizes.footnote,
    fontWeight: '700',
  },
  cta: {
    borderRadius: radii.full,
    minHeight: 46,
    marginBottom: spacing.md,
  },
  socialLabel: {
    ...typography.sizes.footnote,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  socialBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '800',
    color: '#DB4437',
  },
  toggleLink: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toggleText: {
    ...typography.sizes.subhead,
  },
  toggleTextBold: {
    ...typography.sizes.subhead,
    fontWeight: '700',
  },
});
