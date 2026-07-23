/**
 * Mates screen — Medication-based matching system.
 *
 * Shows the user's medications, each with a matched mate (1 mate per med).
 * Users can find mates for unmatched meds and chat with matched mates.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { EmptyState } from '@/src/design-system/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/src/design-system/components/button';
import { MateMatchCard } from '@/src/features/mates/components/mate-match-card';
import { MateProfileSheet } from '@/src/features/mates/components/mate-profile-sheet';
import { MatchCelebration } from '@/src/features/mates/components/match-celebration';
import {
  useMedsWithMatches,
  useFindMateForMed,
  useFindRandomMate,
  useRandomMateMatch,
  type MedWithMatch,
} from '@/src/features/mates/hooks/use-med-matching';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUIStore } from '@/src/stores/ui-store';
import { useProGate } from '@/src/features/payments/use-pro-gate';
import { DiscoverDisclaimerBanner } from '@/src/features/moderation';
import { requestReviewOnceForEvent } from '@/src/features/ratings/in-app-review';

export default function MatesMatchingScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const discoverBannerDismissed = useUIStore((s) => s.discoverBannerDismissed);
  const setDiscoverBannerDismissed = useUIStore((s) => s.setDiscoverBannerDismissed);
  const { medsWithMatches, isLoading } = useMedsWithMatches();
  const { randomMatch, mateProfile: randomMateProfile, isLoading: randomMatchLoading } = useRandomMateMatch();
  const findMate = useFindMateForMed();
  const findRandomMate = useFindRandomMate();
  const { isPro } = useProGate();

  // Track which med is currently searching
  const [searchingMedId, setSearchingMedId] = useState<string | null>(null);
  const [searchingRandom, setSearchingRandom] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Profile sheet state
  const [profileSheet, setProfileSheet] = useState<{
    visible: boolean;
    item: MedWithMatch | null;
  }>({ visible: false, item: null });

  // Match celebration state
  const [celebration, setCelebration] = useState<{
    visible: boolean;
    mateName: string;
    medName: string;
    medColor: string;
  }>({ visible: false, mateName: '', medName: '', medColor: '' });

  // Stats
  const totalMeds = medsWithMatches.length;
  const matchedCount = medsWithMatches.filter((m) => m.match).length;
  const hasRandomMatch = !!randomMatch && !!randomMateProfile;

  const handleFindMate = useCallback(
    async (item: MedWithMatch) => {
      setSearchingMedId(item.med.id);
      try {
        const result = await findMate.mutateAsync(item.med);
        if (result) {
          // Get the mate name from the result
          const mateUid = result.uids.find((uid) => uid !== user?.uid) ?? result.uids[0];
          const mateProfile = result.mateProfiles?.[mateUid];
          const mateName = mateProfile?.nickname || mateProfile?.displayName || t('mates.yourMate');

          // Show celebration animation + sound
          setCelebration({
            visible: true,
            mateName,
            medName: item.med.name,
            medColor: item.med.color || '#007AFF',
          });
          void requestReviewOnceForEvent('mate_found', user?.uid);
        } else {
          Alert.alert(
            t('mates.noMatchTitle'),
            t('mates.noMatchMessage'),
            [{ text: t('mates.ok') }],
          );
          showToast({
            type: 'info',
            title: t('mates.queueTitle'),
            message: t('mates.queueMessage'),
          });
        }
      } catch {
        showToast({ type: 'error', title: t('authErrors.generic') });
      } finally {
        setSearchingMedId(null);
      }
    },
    [findMate, showToast, t, user?.uid],
  );

  const handleFindRandomMate = useCallback(async () => {
    setSearchingRandom(true);
    try {
      const result = await findRandomMate.mutateAsync();
      if (result) {
        const mateUid = result.uids.find((uid) => uid !== user?.uid) ?? result.uids[0];
        const mateProfile = result.mateProfiles?.[mateUid];
        const mateName = mateProfile?.nickname || mateProfile?.displayName || t('mates.yourMate');

        setCelebration({
          visible: true,
          mateName,
            medName: t('mates.randomMatch'),
          medColor: result.medColor || '#8E8E93',
        });
        void requestReviewOnceForEvent('mate_found', user?.uid);
      } else {
        Alert.alert(
          t('mates.noRandomTitle'),
          t('mates.noRandomMessage'),
          [{ text: t('mates.ok') }],
        );
      }
    } catch {
      showToast({ type: 'error', title: t('mates.randomFailed') });
    } finally {
      setSearchingRandom(false);
    }
  }, [findRandomMate, showToast, t, user?.uid]);

  const handleOpenChat = useCallback(
    (item: MedWithMatch) => {
      if (!item.match) return;
      router.push({
        pathname: '/(tabs)/inbox/[chatId]',
        params: {
          chatId: item.match.id,
          mateName: (item.mateProfile?.nickname || item.mateProfile?.displayName) ?? t('mates.mateLabel'),
          mateAvatar: item.mateProfile?.photoURL ?? '',
          mateUid: item.mateProfile?.uid ?? '',
          medName: item.med.name,
          medColor: item.med.color || '#007AFF',
        },
      });
    },
    [router],
  );

  const handleViewProfile = useCallback((item: MedWithMatch) => {
    setProfileSheet({ visible: true, item });
  }, []);

  const handleOpenRandomChat = useCallback(() => {
    if (!randomMatch || !randomMateProfile) return;
    router.push({
      pathname: '/(tabs)/inbox/[chatId]',
      params: {
        chatId: randomMatch.id,
        mateName: (randomMateProfile.nickname || randomMateProfile.displayName) ?? t('mates.mateLabel'),
        mateAvatar: randomMateProfile.photoURL ?? '',
        mateUid: randomMateProfile.uid,
        medName: randomMatch.medDisplayName || t('mates.randomMatch'),
        medColor: randomMatch.medColor || '#8E8E93',
      },
    });
  }, [randomMatch, randomMateProfile, router, t]);

  const handleCelebrationDone = useCallback(() => {
    setCelebration((state) =>
      state.visible ? { ...state, visible: false } : state,
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Small delay for pull-to-refresh UX
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: MedWithMatch; index: number }) => (
      <MateMatchCard
        item={item}
        index={index}
        onFindMate={() => handleFindMate(item)}
        onOpenChat={() => handleOpenChat(item)}
        onViewProfile={() => handleViewProfile(item)}
        isSearching={searchingMedId === item.med.id}
      />
    ),
    [handleFindMate, handleOpenChat, handleViewProfile, searchingMedId],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.statsRow}>
        {/* Medical Disclaimer Banner */}
        <DiscoverDisclaimerBanner
          dismissed={discoverBannerDismissed}
          onDismiss={() => setDiscoverBannerDismissed(true)}
        />

        {/* Random matching card */}
        <View style={[styles.randomCard, { backgroundColor: c.card, borderColor: c.separator }]}> 
          <View style={styles.randomHeaderRow}>
            <View style={[styles.randomIconWrap, { backgroundColor: c.primaryLight }]}>
              <IconSymbol name="shuffle" size={16} color={c.primary} />
            </View>
            <View style={styles.randomTextWrap}>
              <Text style={[styles.randomTitle, { color: c.textPrimary }]}>{t('mates.randomTitle')}</Text>
              <Text style={[styles.randomSubtitle, { color: c.textSecondary }]}>
                {t('mates.randomSubtitle')}
              </Text>
            </View>
          </View>

          {hasRandomMatch ? (
            <View style={styles.randomMatchedRow}>
              <View style={styles.randomMateMeta}>
                <Text style={[styles.randomMateName, { color: c.textPrimary }]} numberOfLines={1}>
                  {randomMateProfile.nickname || randomMateProfile.displayName}
                </Text>
                <Text style={[styles.randomMateBio, { color: c.textSecondary }]} numberOfLines={1}>
                  {randomMateProfile.bio || t('mates.randomBioFallback')}
                </Text>
              </View>
              <Button
                title={t('mates.openChat')}
                onPress={handleOpenRandomChat}
                size="sm"
              />
            </View>
          ) : (
            <Button
              title={searchingRandom ? t('mates.searching') : t('mates.findRandom')}
              onPress={handleFindRandomMate}
              variant="secondary"
              size="md"
              disabled={searchingRandom}
            />
          )}
        </View>

        {/* Stats Pills */}
        <View style={styles.statsPillsRow}>
          <View style={[styles.statPill, { backgroundColor: c.primaryLight }]}>
            <IconSymbol name="pill.fill" size={14} color={c.primary} />
            <Text style={[styles.statPillText, { color: c.primary }]}>
              {totalMeds} {totalMeds === 1 ? t('mates.medSingle') : t('mates.medPlural')}
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: c.successLight }]}>
            <IconSymbol name="person.2.fill" size={14} color={c.success} />
            <Text style={[styles.statPillText, { color: c.success }]}>
              {matchedCount} {t('mates.mateLabel')}
            </Text>
          </View>
          {totalMeds > 0 && matchedCount < totalMeds && (
            <View style={[styles.statPill, { backgroundColor: c.warningLight }]}>
              <IconSymbol name="exclamationmark.circle.fill" size={14} color={c.warning} />
              <Text style={[styles.statPillText, { color: c.warning }]}>
                {totalMeds - matchedCount} {t('mates.unmatched')}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: c.textSecondary }]}>
          {t('mates.description')}
        </Text>
      </View>
    ),
    [
      c,
      totalMeds,
      matchedCount,
      discoverBannerDismissed,
      hasRandomMatch,
      randomMateProfile,
      searchingRandom,
      handleOpenRandomChat,
      handleFindRandomMate,
      setDiscoverBannerDismissed,
    ],
  );

  if (isLoading || randomMatchLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  /* ── Pro Gate: free users see a locked screen ── */
  if (!isPro) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.background }]}>
        <View style={styles.lockContainer}>
          <View style={[styles.lockIcon, { backgroundColor: c.primaryLight }]}>
            <IconSymbol name="lock.fill" size={32} color={c.primary} />
          </View>
          <Text style={[styles.lockTitle, { color: c.textPrimary }]}>
            {t('mates.proTitle')}
          </Text>
          <Text style={[styles.lockSubtitle, { color: c.textSecondary }]}>
            {t('mates.proSubtitle')}
          </Text>
          <Button
            title={t('mates.upgrade')}
            onPress={() => router.push('/paywall')}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={medsWithMatches}
        renderItem={renderItem}
        keyExtractor={(item) => item.med.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.list,
          totalMeds === 0 && styles.emptyList,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="pill.fill"
            title={t('mates.emptyTitle')}
            subtitle={t('mates.emptySubtitle')}
            actionLabel={t('mates.addMedication')}
            onAction={() => router.push('/(tabs)/meds/add')}
          />
        }
      />

      {/* Mate Profile Sheet */}
      <MateProfileSheet
        visible={profileSheet.visible}
        onClose={() => setProfileSheet({ visible: false, item: null })}
        onSendMessage={() => {
          const pItem = profileSheet.item;
          setProfileSheet({ visible: false, item: null });
          if (pItem?.match) {
            router.push({
              pathname: '/(tabs)/inbox/[chatId]',
              params: {
                chatId: pItem.match.id,
                mateName: (pItem.mateProfile?.nickname || pItem.mateProfile?.displayName) ?? t('mates.mateLabel'),
                mateAvatar: pItem.mateProfile?.photoURL ?? '',
                mateUid: pItem.mateProfile?.uid ?? '',
                medName: pItem.med.name,
                medColor: pItem.med.color || '#007AFF',
              },
            });
          }
        }}
        mate={profileSheet.item?.mateProfile ?? null}
        sharedMedName={profileSheet.item?.med.name ?? ''}
        medColor={profileSheet.item?.med.color ?? '#007AFF'}
      />

      {/* Match Celebration */}
      <MatchCelebration
        visible={celebration.visible}
        mateName={celebration.mateName}
        medName={celebration.medName}
        medColor={celebration.medColor}
        onDone={handleCelebrationDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 340,
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  lockTitle: {
    ...typography.sizes.title2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  lockSubtitle: {
    ...typography.sizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  emptyList: {
    flexGrow: 1,
  },
  statsRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  randomCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  randomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  randomIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  randomTextWrap: {
    flex: 1,
    gap: 2,
  },
  randomTitle: {
    ...typography.sizes.callout,
    fontWeight: '700',
  },
  randomSubtitle: {
    ...typography.sizes.footnote,
    lineHeight: 18,
  },
  randomMatchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  randomMateMeta: {
    flex: 1,
    gap: 2,
  },
  randomMateName: {
    ...typography.sizes.subhead,
    fontWeight: '700',
  },
  randomMateBio: {
    ...typography.sizes.caption1,
  },
  statsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.full,
    gap: 4,
  },
  statPillText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  description: {
    ...typography.sizes.footnote,
    lineHeight: 18,
  },
});
