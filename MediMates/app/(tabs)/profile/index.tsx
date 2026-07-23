/**
 * Profile screen — Clean, modern iOS-style.
 *
 * Sections: Profile card, Pro upgrade banner, Quick stats,
 * Settings (notifications + subscription), Developer / Debug, Sign out.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { useColors, useAppTheme } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { ListItem } from '@/src/design-system/components/list-item';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/src/stores/auth-store';
import { signOut, updateUserProfile } from '@/src/features/auth/auth-provider';
import { useUIStore } from '@/src/stores/ui-store';
import { useMeds } from '@/src/features/meds/hooks/use-meds';
import { useTodayDoses } from '@/src/features/today/hooks/use-today-doses';
import { functions } from '@/src/lib/firebase';
import { useSubscription } from '@/src/features/payments/use-subscription';
import {
  cancelAllMedReminders,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '@/src/features/notifications/notification-service';

// Legal URLs
const LEGAL_URLS = {
  privacyPolicy: 'https://lavish-shirt-ecb.notion.site/MedMates-Privacy-Policy-31dca73dd79680a386f8daf27aa6b4af',
  termsOfUse: 'https://lavish-shirt-ecb.notion.site/MedMates-Terms-of-Use-321ca73dd79680deb2c3ed0c1e229165',
};

const PRO_IMAGES = {
  general: require('@/assets/images/pro.png'),
  monthly: require('@/assets/images/montthly.png'),
  yearly: require('@/assets/images/annually.png'),
} as const;

export default function ProfileScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const isPro = user?.pro?.active ?? false;
  const { manageSubscription } = useSubscription();
  const [isDeleting, setIsDeleting] = useState(false);
  const [socialUpdating, setSocialUpdating] = useState(false);

  // Database-connected data
  const { data: meds = [] } = useMeds();
  const { adherence } = useTodayDoses();

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
      t('profile.editNameTitle'),
      t('profile.editNameMessage'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.save'),
          onPress: async (newName) => {
            const trimmed = (newName ?? '').trim();
            if (!trimmed || !user) return;
            try {
              await updateUserProfile(user.uid, { displayName: trimmed });
              showToast({ type: 'success', title: t('profile.nameUpdated') });
            } catch {
              showToast({ type: 'error', title: t('profile.nameUpdateFailed') });
            }
          },
        },
      ],
      'plain-text',
      user?.displayName ?? '',
    );
  };

  const handleSignOut = () => {
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutMessage'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.signOutTitle'),
        style: 'destructive',
        onPress: async () => {
          await cancelAllMedReminders();
          await signOut();
          showToast({ type: 'info', title: t('profile.signedOut') });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteTitle'),
      t('profile.deleteMessage'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteEverything'),
          style: 'destructive',
          onPress: () => {
            // Second confirmation for safety
            Alert.alert(
              t('profile.finalConfirmTitle'),
              t('profile.finalConfirmMessage'),
              [
                { text: t('profile.cancel'), style: 'cancel' },
                {
                  text: t('profile.confirmDelete'),
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await cancelAllMedReminders();
                      const fn = httpsCallable(functions, 'deleteUserAccount');
                      await fn({});
                      useAuthStore.getState().clear();
                      showToast({ type: 'success', title: t('profile.accountDeleted') });
                    } catch (error) {
                      console.error('[Profile] Delete account error:', error);
                      showToast({ type: 'error', title: t('profile.accountDeleteFailed') });
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
        t('profile.enableNotificationsTitle'),
        t('profile.enableNotificationsMessage'),
        [
          { text: t('profile.cancel'), style: 'cancel' },
          {
            text: t('profile.enable'),
            onPress: async () => {
              const granted = await requestNotificationPermissions();
              if (granted) {
                showToast({ type: 'success', title: t('profile.notificationsEnabled') });
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

  const handleSocialOptInChange = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      setSocialUpdating(true);
      try {
        await updateUserProfile(user.uid, {
          socialOptIn: enabled,
          socialVisible: enabled,
        });
        showToast({
          type: 'success',
          title: enabled ? t('profile.socialVisibleEnabled') : t('profile.socialVisibleDisabled'),
          message: enabled
            ? t('profile.socialVisibleEnabledMessage')
            : t('profile.socialVisibleDisabledMessage'),
        });
      } catch {
        showToast({ type: 'error', title: t('profile.socialUpdateFailed') });
      } finally {
        setSocialUpdating(false);
      }
    },
    [showToast, t, user],
  );

  return (
    <>
      <StatusBar style="light" />
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? '#000000' : c.primary,
            paddingTop: insets.top + spacing.md,
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? ['#101828', '#000000'] : ['#1687FF', '#0062CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        />
        <View style={styles.heroOrbOne} />
        <View style={styles.heroOrbTwo} />

        <View style={styles.heroTopRow}>
          <Text style={styles.heroTitle}>Profile</Text>
          <PressableScale onPress={handleEditName}>
            <View style={styles.editIconWrap}>
              <IconSymbol name="pencil" size={16} color="#FFFFFF" />
            </View>
          </PressableScale>
        </View>

        <View style={styles.heroIdentityRow}>
          <View style={styles.avatarShell}>
            <Avatar name={user?.displayName ?? 'User'} uri={user?.photoURL} size="lg" />
          </View>
          <View style={styles.heroIdentityText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.displayName ?? t('profileSettings.defaultUser')}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? t('profileSettings.notSet')}
            </Text>
            <View style={styles.planPill}>
              <IconSymbol name={isPro ? 'crown.fill' : 'person.crop.circle'} size={12} color="#FFFFFF" />
              <Text style={styles.planPillText}>
                {isPro ? t('profileSettings.proMonthly') : t('profileSettings.free')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bodyContent}>
      <View style={[styles.accountCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
        <View style={styles.accountHeaderRow}>
          <Text style={[styles.accountTitle, { color: c.textPrimary }]}>Account details</Text>
          <PressableScale onPress={isPro ? manageSubscription : () => router.push('/(tabs)/profile/paywall')}>
            <Text style={[styles.accountAction, { color: c.primary }]}>
              {isPro ? t('profileSettings.subscriptionTitle') : t('profileSettings.seePlans')}
            </Text>
          </PressableScale>
        </View>

        <View style={styles.accountInfoRow}>
          <Text style={[styles.accountInfoLabel, { color: c.textTertiary }]}>{t('profileSettings.name')}</Text>
          <Text style={[styles.accountInfoValue, { color: c.textPrimary }]} numberOfLines={1}>
            {user?.displayName ?? t('profileSettings.notSet')}
          </Text>
        </View>
        <View style={styles.accountInfoRow}>
          <Text style={[styles.accountInfoLabel, { color: c.textTertiary }]}>{t('profileSettings.username')}</Text>
          <Text style={[styles.accountInfoValue, { color: c.textPrimary }]} numberOfLines={1}>
            {(user as any)?.nickname || t('profileSettings.notSet')}
          </Text>
        </View>

        <View style={[styles.accountDivider, { backgroundColor: c.separator }]} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.primary }]}>{activeMedsCount}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('profileSettings.activeMeds')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.warning }]}>{totalReminders}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('profileSettings.reminders')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.success }]}>{adherencePercent}%</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('profileSettings.today')}</Text>
          </View>
        </View>
      </View>

      {!isPro && (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile/paywall')}
          activeOpacity={0.9}
          style={styles.proCardWrapper}
        >
          <LinearGradient
            colors={isDark ? ['#131C2F', '#0E2F4B'] : ['#1D77C3', '#0B5EA9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proCard}
          >
            <View style={styles.proCardIconWrap}>
              <Image source={PRO_IMAGES.general} style={styles.proCardIcon} resizeMode="contain" />
            </View>

            <View style={styles.proCardBody}>
              <Text style={styles.proCardEyebrow}>MediMates Pro</Text>
              <Text style={styles.proCardTitle}>{t('profileSettings.proTitle')}</Text>
              <Text style={styles.proCardDesc}>{t('profileSettings.proDesc')}</Text>

              <View style={styles.proCardFooterRow}>
                <Text style={styles.proPrice}>{t('profileSettings.proPrice')}</Text>
                <View style={styles.proCardCta}>
                  <Text style={styles.proCardCtaText}>{t('profileSettings.seePlans')}</Text>
                  <IconSymbol name="arrow.right" size={14} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
        {t('profileSettings.settings')}
      </Text>

      <View style={[styles.optionCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
        <ListItem
          title={t('profileSettings.pushTitle')}
          subtitle={t('profileSettings.pushSubtitle')}
          leadingIcon="bell.badge.fill"
          leadingIconColor={c.error}
          trailing={{ type: 'chevron' }}
          onPress={handleNotificationSettings}
          style={styles.optionRow}
        />
      </View>

      <View style={[styles.optionCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
        <ListItem
          title={t('profileSettings.matesVisibilityTitle')}
          subtitle={
            socialUpdating
              ? t('profileSettings.updating')
              : user?.socialOptIn
                ? t('profileSettings.matesVisible')
                : t('profileSettings.matesHidden')
          }
          leadingIcon="person.2.fill"
          leadingIconColor={c.primary}
          trailing={{
            type: 'switch',
            value: !!user?.socialOptIn,
            onValueChange: handleSocialOptInChange,
          }}
          style={styles.optionRow}
        />
      </View>

      <View style={[styles.optionCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
        <ListItem
          title={t('profileSettings.subscriptionTitle')}
          subtitle={isPro ? t('profileSettings.subscriptionSubtitle') : undefined}
          leadingIcon="crown.fill"
          leadingIconColor="#FFD700"
          trailing={{
            type: 'text',
            text: isPro
              ? (user?.pro?.plan === 'yearly' ? t('profileSettings.proYearly') : t('profileSettings.proMonthly'))
              : t('profileSettings.free'),
          }}
          onPress={isPro ? manageSubscription : () => router.push('/(tabs)/profile/paywall')}
          style={styles.optionRow}
        />
      </View>

      <View style={[styles.optionCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
        <ListItem
          title={t('profileSettings.privacyPolicy')}
          leadingIcon="shield.fill"
          leadingIconColor={c.success}
          trailing={{ type: 'chevron' }}
          onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy)}
          style={styles.optionRow}
        />
      </View>

      <View style={[styles.optionCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
        <ListItem
          title={t('profileSettings.termsOfUse')}
          leadingIcon="doc.text.fill"
          leadingIconColor={c.textSecondary}
          trailing={{ type: 'chevron' }}
          onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.termsOfUse)}
          style={styles.optionRow}
        />
      </View>

      <View style={[styles.optionCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
        <ListItem
          title={t('profile.signOutTitle')}
          subtitle={t('profile.signOutMessage')}
          leadingIcon="rectangle.portrait.and.arrow.right"
          leadingIconColor={c.warning}
          trailing={{ type: 'chevron' }}
          onPress={handleSignOut}
          style={styles.optionRow}
        />
      </View>

      <View style={[styles.deleteCardWrap, { backgroundColor: c.errorLight, borderColor: c.error + '33' }]}>
        <PressableScale onPress={handleDeleteAccount} disabled={isDeleting}>
          <View style={styles.deleteCardInner}>
            {isDeleting ? <ActivityIndicator size="small" color={c.error} /> : <IconSymbol name="trash.fill" size={18} color={c.error} />}
            <View style={styles.deleteAccountTexts}>
              <Text style={[styles.deleteAccountTitle, { color: c.error }]}>{t('profile.deleteTitle')}</Text>
              <Text style={[styles.deleteAccountSub, { color: c.error + 'B0' }]}>{t('profileSettings.deleteSubtitle')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={c.error + '80'} />
          </View>
        </PressableScale>
      </View>

      <Text style={[styles.version, { color: c.textTertiary }]}>
        {t('profileSettings.version')}
      </Text>
      </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
  },

  heroCard: {
    overflow: 'hidden',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radii.sheet,
    borderBottomRightRadius: radii.sheet,
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOrbOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -130,
    right: -60,
  },
  heroOrbTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -76,
    left: -30,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.sizes.title2,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  editIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarShell: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.84)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIdentityText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    ...typography.sizes.title3,
    color: '#FFFFFF',
  },
  profileEmail: {
    ...typography.sizes.subhead,
    color: 'rgba(255,255,255,0.76)',
    marginTop: spacing.xs,
  },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  planPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  accountCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  accountTitle: {
    ...typography.sizes.headline,
  },
  accountAction: {
    ...typography.sizes.subhead,
    fontWeight: '700',
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  accountInfoLabel: {
    ...typography.sizes.footnote,
  },
  accountInfoValue: {
    ...typography.sizes.subhead,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  accountDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    ...typography.sizes.caption2,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    alignSelf: 'center',
  },

  proCardWrapper: {
    marginBottom: spacing.md,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  proCardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  proCardIcon: {
    width: 34,
    height: 34,
  },
  proCardBody: {
    flex: 1,
  },
  proCardEyebrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  proCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  proCardDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  proCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  proCardCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  proPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  sectionTitle: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  optionCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  optionRow: {
    paddingVertical: spacing.sm + 2,
  },

  deleteCardWrap: {
    marginTop: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  deleteCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
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
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});
