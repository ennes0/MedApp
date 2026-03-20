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
          const mateName = mateProfile?.nickname || mateProfile?.displayName || 'Your Mate';

          // Show celebration animation + sound
          setCelebration({
            visible: true,
            mateName,
            medName: item.med.name,
            medColor: item.med.color || '#007AFF',
          });
          void requestReviewOnceForEvent('mate_found');
        } else {
          Alert.alert(
            'No match found yet',
            'We could not find a suitable match right now, likely due to limited active users taking this medication.\n\nYou have been placed in the matching queue for this medication. We will notify you as soon as a compatible user is found.\n\nNote: Personalized AI chat support under MedAI is planned for a future release.',
            [{ text: 'OK' }],
          );
          showToast({
            type: 'info',
            title: 'You are in the matching queue',
            message: 'We will notify you when a compatible user is found.',
          });
        }
      } catch {
        showToast({ type: 'error', title: 'Something went wrong' });
      } finally {
        setSearchingMedId(null);
      }
    },
    [findMate, showToast, user?.uid],
  );

  const handleFindRandomMate = useCallback(async () => {
    setSearchingRandom(true);
    try {
      const result = await findRandomMate.mutateAsync();
      if (result) {
        const mateUid = result.uids.find((uid) => uid !== user?.uid) ?? result.uids[0];
        const mateProfile = result.mateProfiles?.[mateUid];
        const mateName = mateProfile?.nickname || mateProfile?.displayName || 'Your Mate';

        setCelebration({
          visible: true,
          mateName,
          medName: 'Random Match',
          medColor: result.medColor || '#8E8E93',
        });
        void requestReviewOnceForEvent('mate_found');
      } else {
        Alert.alert(
          'No random match found yet',
          'Right now we could not find a random Pro user who does not share your medications. Try again a little later.',
          [{ text: 'OK' }],
        );
      }
    } catch {
      showToast({ type: 'error', title: 'Random matching failed' });
    } finally {
      setSearchingRandom(false);
    }
  }, [findRandomMate, showToast, user?.uid]);

  const handleOpenChat = useCallback(
    (item: MedWithMatch) => {
      if (!item.match) return;
      router.push({
        pathname: '/(tabs)/inbox/[chatId]',
        params: {
          chatId: item.match.id,
          mateName: (item.mateProfile?.nickname || item.mateProfile?.displayName) ?? 'Mate',
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
        mateName: (randomMateProfile.nickname || randomMateProfile.displayName) ?? 'Mate',
        mateAvatar: randomMateProfile.photoURL ?? '',
        mateUid: randomMateProfile.uid,
        medName: randomMatch.medDisplayName || 'Random Match',
        medColor: randomMatch.medColor || '#8E8E93',
      },
    });
  }, [randomMatch, randomMateProfile, router]);

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
              <Text style={[styles.randomTitle, { color: c.textPrimary }]}>Random Mate</Text>
              <Text style={[styles.randomSubtitle, { color: c.textSecondary }]}>
                Match with a Pro user who does not use the same medications.
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
                  {randomMateProfile.bio || 'Your random support mate is ready to chat'}
                </Text>
              </View>
              <Button
                title="Open Chat"
                onPress={handleOpenRandomChat}
                size="sm"
              />
            </View>
          ) : (
            <Button
              title={searchingRandom ? 'Searching...' : 'Find Random Mate'}
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
              {totalMeds} {totalMeds === 1 ? 'Med' : 'Meds'}
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: c.successLight }]}>
            <IconSymbol name="person.2.fill" size={14} color={c.success} />
            <Text style={[styles.statPillText, { color: c.success }]}>
              {matchedCount} {matchedCount === 1 ? 'Mate' : 'Mate'}
            </Text>
          </View>
          {totalMeds > 0 && matchedCount < totalMeds && (
            <View style={[styles.statPill, { backgroundColor: c.warningLight }]}>
              <IconSymbol name="exclamationmark.circle.fill" size={14} color={c.warning} />
              <Text style={[styles.statPillText, { color: c.warning }]}>
                {totalMeds - matchedCount} Unmatched
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: c.textSecondary }]}>
          Find medication-specific mates or try Random Mate to connect with someone on a different treatment journey.
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
            Mates is a Pro Feature
          </Text>
          <Text style={[styles.lockSubtitle, { color: c.textSecondary }]}>
            Upgrade to Pro to find medication mates, connect and support each other on your health journey.
          </Text>
          <Button
            title="Upgrade to Pro"
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
            title="No medications yet"
            subtitle="Add your medications first, then find mates who take the same meds!"
            actionLabel="Add Medication"
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
                mateName: (pItem.mateProfile?.nickname || pItem.mateProfile?.displayName) ?? 'Mate',
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
