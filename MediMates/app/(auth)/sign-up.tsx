/**
 * Sign-Up screen — Create account with email & password
 *
 * Clean modern form matching the sign-in design.
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
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { signUpWithEmail } from '@/src/features/auth/auth-provider';

function getFirebaseErrorMessage(code?: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function SignUpScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (error: any) {
      const msg = getFirebaseErrorMessage(error?.code);
      Alert.alert('Error', msg);
    } finally {
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
            Create your{'\n'}account
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Join MediMates and start tracking your health.
          </Text>
        </MotiView>

        {/* Form */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 150 }}
          style={styles.form}
        >
          {/* Name field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Full Name</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder="Your full name"
                placeholderTextColor={c.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
              />
            </View>
          </View>

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
                placeholder="Create a password (6+ chars)"
                placeholderTextColor={c.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
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

          {/* Create account button */}
          <Button
            title={loading ? 'Creating account…' : 'Create Account'}
            onPress={handleSignUp}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          />

          {/* Toggle to sign-in */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/sign-in')}
            activeOpacity={0.7}
            style={styles.toggleLink}
          >
            <Text style={[styles.toggleText, { color: c.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Text style={[styles.toggleTextBold, { color: c.primary }]}>
              Sign In
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
