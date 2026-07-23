import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useUIStore } from '@/src/stores/ui-store';
import { useTranslation } from 'react-i18next';
import {
  getAppleHealthConnectionStatus,
  getAppleHealthLastSyncAt,
  getAppleHealthTodaySummary,
  requestAppleHealthPermissions,
  type AppleHealthTodaySummary,
} from './apple-health';

export function useAppleHealth() {
  const showToast = useUIStore((s) => s.showToast);
  const { t } = useTranslation();

  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [todaySummary, setTodaySummary] = useState<AppleHealthTodaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, connected, lastSync] = await Promise.all([
        getAppleHealthTodaySummary(),
        getAppleHealthConnectionStatus(),
        getAppleHealthLastSyncAt(),
      ]);

      const resolvedConnected = connected || !!summary;
      setTodaySummary(summary);
      setIsConnected(resolvedConnected);
      setLastSyncedAt(summary ? new Date() : lastSync);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connect = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      showToast({
        type: 'info',
        title: t('appleHealth.iosOnly'),
      });
      return false;
    }

    const result = await requestAppleHealthPermissions();
    await refresh();

    if (result.ok) {
      showToast({
        type: 'success',
        title: t('appleHealth.connected'),
        message: t('appleHealth.syncEnabled'),
      });
    } else {
      if (result.reason === 'expo_go') {
        showToast({
          type: 'error',
          title: t('appleHealth.expoGoTitle'),
          message: t('appleHealth.expoGoMessage'),
        });
      } else if (result.reason === 'healthkit_unavailable') {
        showToast({
          type: 'error',
          title: t('appleHealth.unavailableTitle'),
          message: t('appleHealth.unavailableMessage'),
        });
      } else if (result.reason === 'module_missing') {
        showToast({
          type: 'error',
          title: t('appleHealth.buildTitle'),
          message: t('appleHealth.buildMessage'),
        });
      } else if (result.reason === 'permission_denied') {
        showToast({
          type: 'error',
          title: t('appleHealth.deniedTitle'),
          message:
            result.message ??
            'Please allow access in iOS Settings > Health > Data Access & Devices.',
        });
        Linking.openURL('app-settings:').catch(() => {});
      } else {
        showToast({
          type: 'error',
          title: t('appleHealth.failedTitle'),
          message: result.message ?? t('appleHealth.tryAgain'),
        });
      }
    }

    return result.ok;
  }, [refresh, showToast, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isConnected,
    lastSyncedAt,
    todaySummary,
    isLoading,
    refresh,
    connect,
  };
}
