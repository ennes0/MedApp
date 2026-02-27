/**
 * Sign-In screen — Email + Password login
 *
 * Clean modern form with back navigation,
 * forgot password, and toggle to sign-up.
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { signInWithEmail, resetPassword } from '@/src/features/auth/auth-provider';

function getFirebaseErrorMessage(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Try again or reset it.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function SignInScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmail(email.trim(), password);
    } catch (error: any) {
      const msg = getFirebaseErrorMessage(error?.code);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Type your email above, then tap Forgot Password.');
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not send reset email.');
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
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <View style={[styles.backCircle, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
            <IconSymbol name="chevron.left" size={18} color={c.textPrimary} />
          </View>
        </TouchableOpacity>

        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.header}
        >
          <Text style={[styles.title, { color: c.textPrimary }]}>
            Login into your{'\n'}account
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Enter your details to continue.
          </Text>
        </MotiView>

        {/* Form */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 150 }}
          style={styles.form}
        >
          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Email</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder="your@email.com"
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

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder="Enter your password"
                placeholderTextColor={c.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
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

          {/* Forgot password */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotText, { color: c.primary }]}>
              Forgot Password
            </Text>
          </TouchableOpacity>

          {/* Login button */}
          <Button
            title={loading ? 'Signing in…' : 'Login'}
            onPress={handleSignIn}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          />

          {/* Toggle to sign-up */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/sign-up')}
            activeOpacity={0.7}
            style={styles.toggleLink}
          >
            <Text style={[styles.toggleText, { color: c.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Text style={[styles.toggleTextBold, { color: c.primary }]}>
              Sign Up
            </Text>
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

  // Back
  backBtn: {
    marginBottom: spacing.lg,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    marginBottom: spacing.xl + spacing.md,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.sizes.body,
    lineHeight: 24,
  },

  // Form
  form: {
    gap: spacing.md + 4,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.sizes.subhead,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: radii.button,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.sizes.body,
    height: '100%',
  },

  // Forgot
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  forgotText: {
    ...typography.sizes.subhead,
    fontWeight: '700',
  },

  // Toggle
  toggleLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  toggleText: {
    ...typography.sizes.subhead,
  },
  toggleTextBold: {
    ...typography.sizes.subhead,
    fontWeight: '700',
  },
});
