/**
 * Social Opt-In screen — Last onboarding step
 *
 * Toggle for social features (Mates). Modern design with
 * animated community preview and privacy assurance.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { Card } from '@/src/design-system/components/card';
import { useAuth } from '@/src/features/auth/use-auth';
import { useAuthStore } from '@/src/stores/auth-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/src/lib/firebase';

export default function SocialOptInScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateProfile } = useAuth();
  const user = useAuthStore((s) => s.user);
  const [socialOptIn, setSocialOptIn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill with existing name, but only if it's not the default "User"
  const currentName = user?.displayName && user.displayName !== 'User' ? user.displayName : '';
  const [displayName, setDisplayName] = useState(currentName);

  // Username (nickname) state
  const existingNickname = (user as any)?.nickname ?? '';
  const [nickname, setNickname] = useState(existingNickname);
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameHint, setNicknameHint] = useState('');

  const generateUsername = useCallback(() => {
    const base = (displayName || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
    return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }, [displayName]);

  const checkUsernameUnique = useCallback(async (name: string): Promise<boolean> => {
    const q = query(collection(db, 'users'), where('nickname', '==', name));
    const snap = await getDocs(q);
    // Allow if it's the user's own existing nickname
    return snap.empty || (snap.size === 1 && snap.docs[0].id === user?.uid);
  }, [user?.uid]);

  const validateNickname = useCallback((val: string) => {
    setNicknameError('');
    setNicknameHint('');
    if (val.length === 0) return;
    if (val.length < 3) { setNicknameError(t('social.usernameMin')); return; }
    if (val.length > 20) { setNicknameError(t('social.usernameMax')); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setNicknameError(t('social.usernameValid')); return; }
    setNicknameHint(t('social.usernameLooksGood'));
  }, [t]);

  const handleNicknameChange = useCallback((val: string) => {
    const cleaned = val.replace(/\s/g, '');
    setNickname(cleaned);
    validateNickname(cleaned);
  }, [validateNickname]);

  const handleContinue = async () => {
    try {
      setLoading(true);
      const nameToSave = displayName.trim() || 'User';

      // Resolve username
      let finalNickname = nickname.trim();
      if (!finalNickname || finalNickname.length < 3 || !/^[a-zA-Z0-9_]+$/.test(finalNickname)) {
        finalNickname = generateUsername();
      }

      // Check uniqueness
      const isUnique = await checkUsernameUnique(finalNickname);
      if (!isUnique) {
        finalNickname = generateUsername();
      }

      await updateProfile?.({
        displayName: nameToSave,
        nickname: finalNickname,
        socialOptIn,
        socialVisible: socialOptIn,
        onboardingComplete: true,
      });
      router.replace('/(tabs)');
    } catch {
      // Proceed anyway — profile will sync later
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
      {/* Top illustration area */}
      <View style={styles.illustrationArea}>
        <LinearGradient
          colors={[c.successLight, 'transparent']}
          style={styles.gradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Community icon */}
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 200 }}
        >
          <View style={[styles.communityCircle, { backgroundColor: c.success + '20' }]}>
            <View style={[styles.communityInner, { backgroundColor: c.success + '30' }]}>
              <IconSymbol name="person.2.fill" size={56} color={c.success} />
            </View>
          </View>
        </MotiView>

        {/* Floating user avatars simulation */}
        <MotiView
          from={{ opacity: 0, translateX: -30 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
          style={[styles.floatingAvatar, styles.avatarLeft]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: c.primary }]}>
            <IconSymbol name="person.fill" size={16} color="#FFF" />
          </View>
        </MotiView>
        <MotiView
          from={{ opacity: 0, translateX: 30 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 500 }}
          style={[styles.floatingAvatar, styles.avatarRight]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: c.warning }]}>
            <IconSymbol name="person.fill" size={16} color="#FFF" />
          </View>
        </MotiView>
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 600 }}
          style={[styles.floatingAvatar, styles.avatarTop]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: c.secondary }]}>
            <IconSymbol name="person.fill" size={16} color="#FFF" />
          </View>
        </MotiView>
      </View>

      {/* Content */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
        style={styles.content}
      >
        <Text style={[styles.title, { color: c.textPrimary }]}>
          {t('social.title')}
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {t('social.subtitle')}
        </Text>

        {/* Name input */}
        <View style={[styles.nameCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <View style={styles.nameLabel}>
            <IconSymbol name="person.fill" size={18} color={c.primary} />
            <Text style={[styles.nameLabelText, { color: c.textPrimary }]}>
              {t('social.nameLabel')}
            </Text>
          </View>
          <TextInput
            style={[styles.nameInput, { color: c.textPrimary, backgroundColor: c.background, borderColor: c.border }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('social.namePlaceholder')}
            placeholderTextColor={c.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={50}
          />
        </View>

        {/* Toggle card */}
        <View style={[styles.toggleCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
              <IconSymbol name="heart.circle.fill" size={24} color={c.success} />
            </View>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleTitle, { color: c.textPrimary }]}>
                {t('social.socialToggleTitle')}
              </Text>
              <Text style={[styles.toggleSubtitle, { color: c.textSecondary }]}>
                {t('social.socialToggleSubtitle')}
              </Text>
            </View>
            <Switch
              value={socialOptIn}
              onValueChange={setSocialOptIn}
              trackColor={{ false: c.border, true: c.success }}
            />
          </View>
        </View>

        {/* Username + Privacy — only show when social is enabled */}
        <AnimatePresence>
          {socialOptIn && (
            <MotiView
              from={{ opacity: 0, translateY: -8 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -8 }}
              transition={{ type: 'timing', duration: 250 }}
            >
              {/* Username input */}
              <View style={[styles.nameCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
                <View style={styles.nameLabel}>
                  <IconSymbol name="at" size={18} color={c.primary} />
                  <Text style={[styles.nameLabelText, { color: c.textPrimary }]}>
                    {t('social.usernameLabel')}
                  </Text>
                </View>
                <TextInput
                  style={[styles.nameInput, { color: c.textPrimary, backgroundColor: c.background, borderColor: nicknameError ? c.error : c.border }]}
                  value={nickname}
                  onChangeText={handleNicknameChange}
                  placeholder={t('social.usernamePlaceholder')}
                  placeholderTextColor={c.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={20}
                />
                {nicknameError ? (
                  <Text style={[styles.fieldHint, { color: c.error }]}>{nicknameError}</Text>
                ) : nicknameHint ? (
                  <Text style={[styles.fieldHint, { color: c.success }]}>{nicknameHint}</Text>
                ) : (
                  <Text style={[styles.fieldHint, { color: c.textTertiary }]}>{t('social.usernameHint')}</Text>
                )}
              </View>

              {/* Privacy assurance */}
              <View style={[styles.privacyBox, { backgroundColor: c.successLight }]}>
                <IconSymbol name="lock.shield.fill" size={18} color={c.success} />
                <View style={styles.privacyTextWrap}>
                  <Text style={[styles.privacyTitle, { color: c.success }]}>
                    {t('social.privacyTitle')}
                  </Text>
                  <Text style={[styles.privacyText, { color: c.success }]}>
                    {t('social.privacyBody')}
                  </Text>
                </View>
              </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Pro badge hint */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 700 }}
        >
          <View style={[styles.proHint, { backgroundColor: c.primary + '10', borderColor: c.primary + '25' }]}>
            <IconSymbol name="sparkles" size={16} color={c.primary} />
            <Text style={[styles.proHintText, { color: c.primary }]}>
              {t('social.proHint')}
            </Text>
          </View>
        </MotiView>
      </MotiView>
      </ScrollView>

      {/* Buttons */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 500 }}
        style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          title={t('social.getStarted')}
          onPress={handleContinue}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
        />
      </MotiView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Illustration
  illustrationArea: {
    height: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  communityCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingAvatar: {
    position: 'absolute',
  },
  avatarLeft: {
    left: '18%',
    top: '35%',
  },
  avatarRight: {
    right: '18%',
    top: '40%',
  },
  avatarTop: {
    right: '30%',
    top: '15%',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.sizes.body,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },

  // Name input
  nameCard: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  nameLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  nameLabelText: {
    ...typography.sizes.headline,
    fontWeight: '600',
  },
  nameInput: {
    fontSize: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  fieldHint: {
    ...typography.sizes.caption1,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },

  // Toggle card
  toggleCard: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  toggleIcon: {
    marginRight: spacing.xs,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    ...typography.sizes.headline,
    marginBottom: 2,
  },
  toggleSubtitle: {
    ...typography.sizes.footnote,
    lineHeight: 17,
  },

  // Privacy
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  privacyTextWrap: {
    flex: 1,
  },
  privacyTitle: {
    ...typography.sizes.subhead,
    fontWeight: '700',
    marginBottom: 2,
  },
  privacyText: {
    ...typography.sizes.footnote,
    lineHeight: 17,
  },

  // Pro hint
  proHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  proHintText: {
    ...typography.sizes.footnote,
    fontWeight: '600',
    flex: 1,
  },

  // Bottom
  bottom: {
    paddingHorizontal: spacing.lg,
  },
});
