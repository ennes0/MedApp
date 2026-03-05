/**
 * Profile screen — Clean, modern iOS-style.
 *
 * Sections: Profile card, Pro upgrade banner, Quick stats,
 * Settings (notifications + subscription), Developer / Debug, Sign out.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { useColors, useAppTheme } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { Card } from '@/src/design-system/components/card';
import { ListItem } from '@/src/design-system/components/list-item';
import { Button } from '@/src/design-system/components/button';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/src/stores/auth-store';
import { signOut, updateUserProfile } from '@/src/features/auth/auth-provider';
import { useUIStore } from '@/src/stores/ui-store';
import { useMeds } from '@/src/features/meds/hooks/use-meds';
import { useTodayDoses } from '@/src/features/today/hooks/use-today-doses';
import { functions } from '@/src/lib/firebase';
import {
  cancelAllMedReminders,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  sendTestNotification,
  listScheduledNotifications,
  scheduleMedReminders,
} from '@/src/features/notifications/notification-service';
import type { NotificationTier } from '@/src/features/notifications/notification-service';

export default function ProfileScreen() {
  const c = useColors();
  const { isDark } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const isPro = user?.pro?.active ?? false;
  const [devOpen, setDevOpen] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Database-connected data
  const { data: meds = [] } = useMeds();
  const { takenCount, totalCount, adherence } = useTodayDoses();

  const activeMedsCount = useMemo(
    () => meds.filter((m) => !m.paused).length,
    [meds],
  );

  const totalReminders = useMemo(
    () =>
      meds
        .filter((m) => !m.paused && m.reminderEnabled)
        .reduce((sum, med) => sum + (med.schedule.times?.length ?? 0), 0),
    [meds],
  );

  // ── Handlers ──

  const handleEditName = () => {
    Alert.prompt(
      'Edit Name',
      'Enter your display name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newName) => {
            const trimmed = (newName ?? '').trim();
            if (!trimmed || !user) return;
            try {
              await updateUserProfile(user.uid, { displayName: trimmed });
              showToast({ type: 'success', title: 'Name updated' });
            } catch {
              showToast({ type: 'error', title: 'Failed to update name' });
            }
          },
        },
      ],
      'plain-text',
      user?.displayName ?? '',
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await cancelAllMedReminders();
          await signOut();
          showToast({ type: 'info', title: 'Signed out' });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and ALL your data including medications, dose logs, chat history, and matches. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            // Second confirmation for safety
            Alert.alert(
              'Final Confirmation',
              'Type DELETE to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await cancelAllMedReminders();
                      const fn = httpsCallable(functions, 'deleteUserAccount');
                      await fn({});
                      useAuthStore.getState().clear();
                      showToast({ type: 'success', title: 'Account deleted' });
                    } catch (error) {
                      console.error('[Profile] Delete account error:', error);
                      showToast({ type: 'error', title: 'Failed to delete account. Please try again.' });
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleNotificationSettings = async () => {
    const status = await getNotificationPermissionStatus();
    if (status === 'granted') {
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
    } else {
      Alert.alert(
        'Enable Notifications',
        'Medication reminders require push notification permission.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const granted = await requestNotificationPermissions();
              if (granted) {
                showToast({ type: 'success', title: 'Notifications enabled' });
              } else {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            },
          },
        ],
      );
    }
  };

  const adherencePercent = Math.round((adherence ?? 0) * 100);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Header Card ── */}
      <View style={[styles.profileHeader, { backgroundColor: c.card, ...shadows.sm }]}>
        <LinearGradient
          colors={
            isDark
              ? [c.primary + '20', c.primary + '08', 'transparent']
              : [c.primary + '12', c.primary + '05', 'transparent']
          }
          style={styles.profileGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={styles.profileContent}>
          <Avatar
            name={user?.displayName ?? 'User'}
            uri={user?.photoURL}
            size="lg"
          />
          <PressableScale onPress={handleEditName}>
            <View style={styles.nameEditRow}>
              <Text style={[styles.profileName, { color: c.textPrimary }]}>
                {user?.displayName ?? 'MediMates User'}
              </Text>
              <IconSymbol name="pencil" size={14} color={c.textTertiary} />
            </View>
          </PressableScale>
          <Text style={[styles.profileEmail, { color: c.textSecondary }]}>
            {user?.email ?? ''}
          </Text>
          {isPro && (
            <View style={[styles.proBadge, { backgroundColor: c.primary }]}>
              <IconSymbol name="crown.fill" size={12} color="#FFFFFF" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {/* User info details */}
        <View style={[styles.userInfoSection, { borderTopColor: c.separator }]}>
          <View style={styles.userInfoRow}>
            <IconSymbol name="person.fill" size={15} color={c.textTertiary} />
            <Text style={[styles.userInfoLabel, { color: c.textTertiary }]}>Name</Text>
            <Text style={[styles.userInfoValue, { color: c.textPrimary }]} numberOfLines={1}>
              {user?.displayName ?? 'Not set'}
            </Text>
          </View>
          <View style={styles.userInfoRow}>
            <IconSymbol name="at" size={15} color={c.textTertiary} />
            <Text style={[styles.userInfoLabel, { color: c.textTertiary }]}>Username</Text>
            <Text style={[styles.userInfoValue, { color: c.textPrimary }]} numberOfLines={1}>
              {(user as any)?.nickname || 'Not set'}
            </Text>
          </View>
          <View style={styles.userInfoRow}>
            <IconSymbol name="envelope.fill" size={15} color={c.textTertiary} />
            <Text style={[styles.userInfoLabel, { color: c.textTertiary }]}>Email</Text>
            <Text style={[styles.userInfoValue, { color: c.textPrimary }]} numberOfLines={1}>
              {user?.email ?? 'Not set'}
            </Text>
          </View>
        </View>

        {/* Inline quick stats */}
        <View style={[styles.inlineStats, { borderTopColor: c.separator }]}>
          <View style={styles.inlineStat}>
            <Text style={[styles.inlineStatValue, { color: c.primary }]}>
              {activeMedsCount}
            </Text>
            <Text style={[styles.inlineStatLabel, { color: c.textSecondary }]}>
              Active Meds
            </Text>
          </View>
          <View style={[styles.inlineStatDivider, { backgroundColor: c.separator }]} />
          <View style={styles.inlineStat}>
            <Text style={[styles.inlineStatValue, { color: c.warning }]}>
              {totalReminders}
            </Text>
            <Text style={[styles.inlineStatLabel, { color: c.textSecondary }]}>
              Reminders
            </Text>
          </View>
          <View style={[styles.inlineStatDivider, { backgroundColor: c.separator }]} />
          <View style={styles.inlineStat}>
            <Text style={[styles.inlineStatValue, { color: c.success }]}>
              {adherencePercent}%
            </Text>
            <Text style={[styles.inlineStatLabel, { color: c.textSecondary }]}>
              Today
            </Text>
          </View>
        </View>
      </View>

      {/* ── Pro Upgrade Banner ── */}
      {!isPro && (
        <PressableScale
          onPress={() => router.push('/(tabs)/profile/paywall')}
          style={styles.proCardWrapper}
        >
          <LinearGradient
            colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proCard}
          >
            <View style={styles.proCardLeft}>
              <View style={styles.proIconRow}>
                <View style={styles.proIconCircle}>
                  <IconSymbol name="crown.fill" size={18} color="#FFD700" />
                </View>
                <Text style={styles.proCardTitle}>Upgrade to Pro</Text>
              </View>
              <Text style={styles.proCardDesc}>
                Unlimited meds, smart reminders, analytics & more
              </Text>
              <View style={styles.proCardCta}>
                <Text style={styles.proCardCtaText}>See Plans</Text>
                <IconSymbol name="arrow.right" size={14} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.proCardRight}>
              <Text style={styles.proPrice}>$2.99</Text>
              <Text style={styles.proPricePer}>/month</Text>
            </View>
          </LinearGradient>
        </PressableScale>
      )}

      {/* ── Settings ── */}
      <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
        SETTINGS
      </Text>
      <Card variant="elevated" style={styles.section}>
        <ListItem
          title="Push Notifications"
          subtitle="Medication reminders & alerts"
          leadingIcon="bell.badge.fill"
          leadingIconColor={c.error}
          trailing={{ type: 'chevron' }}
          onPress={handleNotificationSettings}
        />
        <View style={[styles.separator, { backgroundColor: c.separator }]} />
        <ListItem
          title="Subscription"
          leadingIcon="crown.fill"
          leadingIconColor="#FFD700"
          trailing={{
            type: 'text',
            text: isPro ? (user?.pro?.plan === 'yearly' ? 'Pro (Yearly)' : 'Pro (Monthly)') : 'Free',
          }}
          onPress={() => router.push('/(tabs)/profile/paywall')}
        />
        <View style={[styles.separator, { backgroundColor: c.separator }]} />
        <ListItem
          title="Privacy Policy"
          leadingIcon="shield.fill"
          leadingIconColor={c.success}
          trailing={{ type: 'chevron' }}
          onPress={() => {
            // TODO: Open privacy URL
          }}
        />
        <View style={[styles.separator, { backgroundColor: c.separator }]} />
        <ListItem
          title="Terms of Service"
          leadingIcon="doc.text.fill"
          leadingIconColor={c.textSecondary}
          trailing={{ type: 'chevron' }}
          onPress={() => {
            // TODO: Open terms URL
          }}
        />
      </Card>

      {/* ── Developer / Debug ── */}
      <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
        DEVELOPER
      </Text>
      <Card variant="elevated" style={styles.section}>
        <ListItem
          title="Test Notifications"
          subtitle={devOpen ? 'Tap to collapse' : 'Tap to expand tools'}
          leadingIcon="bell.badge.fill"
          leadingIconColor="#FF9500"
          trailing={{ type: 'chevron' }}
          onPress={() => setDevOpen((v) => !v)}
        />
        {devOpen && (
          <View style={styles.devPanel}>
            <View style={styles.devRow}>
              {(['pre_10', 'pre_5', 'main'] as NotificationTier[]).map(
                (tier) => (
                  <PressableScale
                    key={tier}
                    style={[
                      styles.devBtn,
                      {
                        backgroundColor:
                          tier === 'main'
                            ? c.primary
                            : tier === 'pre_5'
                              ? c.warning
                              : c.secondary,
                      },
                    ]}
                    onPress={async () => {
                      setDevLoading(true);
                      await sendTestNotification(tier);
                      setDevLoading(false);
                      showToast({
                        type: 'success',
                        title: `${tier} notification sent (2s)`,
                      });
                    }}
                  >
                    <Text style={styles.devBtnText}>
                      {tier === 'pre_10'
                        ? '🔔 PRE 10'
                        : tier === 'pre_5'
                          ? '🔔 PRE 5'
                          : '💊 MAIN'}
                    </Text>
                  </PressableScale>
                ),
              )}
            </View>

            <View style={[styles.separator, { backgroundColor: c.separator, marginLeft: 0 }]} />

            <ListItem
              title="View Scheduled"
              leadingIcon="clock.fill"
              leadingIconColor={c.primary}
              trailing={{ type: 'chevron' }}
              onPress={async () => {
                const list = await listScheduledNotifications();
                Alert.alert(
                  `Scheduled (${list.length})`,
                  list.length === 0
                    ? 'No scheduled notifications.'
                    : list
                        .slice(0, 15)
                        .map(
                          (n, i) =>
                            `${i + 1}. ${n.content.title ?? '(no title)'}\n   → ${JSON.stringify(n.trigger)}`,
                        )
                        .join('\n\n'),
                );
              }}
            />
            <View style={[styles.separator, { backgroundColor: c.separator, marginLeft: 0 }]} />
            <ListItem
              title="Check Permission"
              leadingIcon="shield.fill"
              leadingIconColor={c.success}
              trailing={{ type: 'chevron' }}
              onPress={async () => {
                const status = await getNotificationPermissionStatus();
                Alert.alert('Permission Status', status);
              }}
            />
            <View style={[styles.separator, { backgroundColor: c.separator, marginLeft: 0 }]} />
            <ListItem
              title="Clear All Notifications"
              leadingIcon="trash.fill"
              leadingIconColor={c.error}
              trailing={{ type: 'chevron' }}
              onPress={async () => {
                await cancelAllMedReminders();
                showToast({ type: 'info', title: 'All notifications cleared' });
              }}
            />
          </View>
        )}
      </Card>

      {/* ── Sign Out ── */}
      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          variant="destructive"
          onPress={handleSignOut}
          fullWidth
        />
      </View>

      {/* ── Delete Account ── */}
      <View style={styles.deleteAccountSection}>
        <PressableScale onPress={handleDeleteAccount} disabled={isDeleting}>
          <View style={[styles.deleteAccountCard, { backgroundColor: c.errorLight, borderColor: c.error + '30' }]}>
            {isDeleting ? (
              <ActivityIndicator size="small" color={c.error} />
            ) : (
              <IconSymbol name="trash.fill" size={18} color={c.error} />
            )}
            <View style={styles.deleteAccountTexts}>
              <Text style={[styles.deleteAccountTitle, { color: c.error }]}>
                Delete Account
              </Text>
              <Text style={[styles.deleteAccountSub, { color: c.error + 'AA' }]}>
                Permanently delete all data & close account
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={c.error + '80'} />
          </View>
        </PressableScale>
      </View>

      <Text style={[styles.version, { color: c.textTertiary }]}>
        MediMates v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  // ── Profile Header ──
  profileHeader: {
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  profileGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  profileName: {
    ...typography.sizes.title3,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  profileEmail: {
    ...typography.sizes.subhead,
    marginTop: 2,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },

  // ── User Info Section ──
  userInfoSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  userInfoLabel: {
    ...typography.sizes.footnote,
    width: 72,
  },
  userInfoValue: {
    ...typography.sizes.subhead,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // ── Inline Stats (inside profile card) ──
  inlineStats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
  },
  inlineStat: {
    flex: 1,
    alignItems: 'center',
  },
  inlineStatValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  inlineStatLabel: {
    ...typography.sizes.caption2,
    marginTop: 2,
  },
  inlineStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: '80%',
    alignSelf: 'center',
  },

  // ── Pro Upgrade Card ──
  proCardWrapper: {
    marginBottom: spacing.md,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  proCardLeft: {
    flex: 1,
  },
  proIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  proIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  proCardDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  proCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proCardCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  proCardRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  proPrice: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  proPricePer: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Sections ──
  sectionTitle: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },

  // ── Developer ──
  devPanel: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  devRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  devBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Sign Out ──
  signOutSection: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },

  // ── Delete Account ──
  deleteAccountSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  deleteAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
  },
  deleteAccountTexts: {
    flex: 1,
  },
  deleteAccountTitle: {
    ...typography.sizes.body,
    fontWeight: '600',
  },
  deleteAccountSub: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },

  version: {
    ...typography.sizes.caption2,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
