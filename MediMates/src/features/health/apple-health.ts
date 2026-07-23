import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const APPLE_HEALTH_CONNECTED_KEY = 'apple_health_connected_v1';
const APPLE_HEALTH_LAST_SYNC_KEY = 'apple_health_last_sync_v1';
const APPLE_HEALTH_PERMISSION_ASKED_KEY = 'apple_health_permission_asked_v1';

interface DoseSyncPayload {
  medId: string;
  medName: string;
  dosage: number;
  unit: string;
  loggedAt?: Date | null;
}

export interface AppleHealthTodaySummary {
  steps: number;
  activeCalories: number;
  sleepHours: number;
}

export type AppleHealthConnectErrorReason =
  | 'not_ios'
  | 'expo_go'
  | 'module_missing'
  | 'healthkit_unavailable'
  | 'permission_denied'
  | 'unknown';

export interface AppleHealthConnectResult {
  ok: boolean;
  reason?: AppleHealthConnectErrorReason;
  message?: string;
}

function isIOS(): boolean {
  return Platform.OS === 'ios';
}

async function getHealthKitModule() {
  // react-native-health snapshots AppleHealthKit from NativeModules in its
  // entry file. With React Native's New Architecture that snapshot can be
  // empty because native modules are loaded lazily. Reading the module here,
  // at the point of use, preserves lazy loading and works with Reanimated 4.
  const healthKit = (NativeModules as any).AppleHealthKit;
  if (!healthKit) return null;

  const constants = require('react-native-health/src/constants');
  return new Proxy(healthKit, {
    get(target, property) {
      if (property === 'Constants') {
        return {
          Activities: constants.Activities,
          Observers: constants.Observers,
          Permissions: constants.Permissions,
          Units: constants.Units,
        };
      }
      return target[property as keyof typeof target];
    },
  });
}

function isHealthKitModuleReady(healthKit: any): boolean {
  return Boolean(
    healthKit &&
      typeof healthKit.isAvailable === 'function' &&
      typeof healthKit.initHealthKit === 'function',
  );
}

function resolvePermission(healthKit: any, key: string, fallback: string): string {
  const fromConstants = healthKit?.Constants?.Permissions?.[key];
  if (typeof fromConstants === 'string' && fromConstants.length > 0) {
    return fromConstants;
  }
  return fallback;
}

function buildHealthKitPermissions(healthKit: any) {
  const mindfulSessionPermission = resolvePermission(
    healthKit,
    'MindfulSession',
    'MindfulSession',
  );
  const stepCountPermission = resolvePermission(
    healthKit,
    'StepCount',
    'StepCount',
  );
  const activeEnergyPermission = resolvePermission(
    healthKit,
    'ActiveEnergyBurned',
    'ActiveEnergyBurned',
  );
  const sleepPermission = resolvePermission(
    healthKit,
    'SleepAnalysis',
    'SleepAnalysis',
  );

  return {
    permissions: {
      read: [
        mindfulSessionPermission,
        stepCountPermission,
        activeEnergyPermission,
        sleepPermission,
      ],
      write: [mindfulSessionPermission],
    },
  };
}

async function initializeHealthKit(healthKit: any): Promise<AppleHealthConnectResult> {
  await setPermissionAskedState(true);
  const permissions = buildHealthKitPermissions(healthKit);

  return new Promise<AppleHealthConnectResult>((resolve) => {
    healthKit.initHealthKit(permissions, (error: string | null) => {
      if (error) {
        resolve({
          ok: false,
          reason: 'permission_denied',
          message: String(error),
        });
        return;
      }
      resolve({ ok: true });
    });
  });
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function isExpoGoRuntime(): boolean {
  // Expo Go cannot load custom native modules like react-native-health.
  const ownership = (Constants as any)?.appOwnership;
  return ownership === 'expo';
}

function ensureDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function setConnectedState(connected: boolean): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_CONNECTED_KEY, connected ? '1' : '0');
}

async function setPermissionAskedState(asked: boolean): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_PERMISSION_ASKED_KEY, asked ? '1' : '0');
}

async function setLastSync(date: Date): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_LAST_SYNC_KEY, date.toISOString());
}

function checkAvailability(healthKit: any): Promise<boolean> {
  return new Promise((resolve) => {
    healthKit.isAvailable((error: unknown, available: boolean) => {
      if (error || !available) {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

function getSleepRange() {
  const now = new Date();
  const start = new Date(now);
  // Capture last night + today's naps.
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);

  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

function getTodayStepCount(healthKit: any): Promise<number> {
  return new Promise((resolve) => {
    healthKit.getStepCount(getTodayRange(), (err: string | null, results: { value?: number } | null) => {
      if (err || !results?.value) {
        resolve(0);
        return;
      }
      resolve(Math.max(0, Math.round(results.value)));
    });
  });
}

function getTodayActiveCalories(healthKit: any): Promise<number> {
  return new Promise((resolve) => {
    healthKit.getActiveEnergyBurned(
      getTodayRange(),
      (err: string | null, results: Array<{ value?: number }> | null) => {
        if (err || !results?.length) {
          resolve(0);
          return;
        }

        const total = results.reduce((sum, item) => sum + (item.value ?? 0), 0);
        resolve(Math.max(0, Math.round(total)));
      },
    );
  });
}

function getHealthSamples(
  healthKit: any,
  options: Record<string, unknown>,
): Promise<Array<any>> {
  const method = healthKit?.getSamples;
  if (typeof method !== 'function') {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    method.call(healthKit, options, (err: string | null, results: Array<any> | null) => {
      if (err || !Array.isArray(results)) {
        resolve([]);
        return;
      }
      resolve(results);
    });
  });
}

function toDateSafe(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isAsleepSample(value: unknown): boolean {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (upper.includes('INBED') || upper.includes('AWAKE')) return false;
    return upper.includes('ASLEEP') || upper.includes('SLEEP');
  }

  if (typeof value === 'number') {
    // 0 is inBed on legacy values. Other values represent asleep variants.
    return value > 0;
  }

  return true;
}

async function getTodaySleepHours(healthKit: any): Promise<number> {
  const samples = await getHealthSamples(healthKit, {
    ...getSleepRange(),
    type: 'SleepAnalysis',
  });

  if (!samples.length) return 0;

  let totalMs = 0;
  for (const sample of samples) {
    if (!isAsleepSample(sample?.value)) continue;

    const start = toDateSafe(sample?.startDate);
    const end = toDateSafe(sample?.endDate);
    if (!start || !end) continue;

    const duration = end.getTime() - start.getTime();
    if (duration > 0) totalMs += duration;
  }

  const hours = totalMs / (1000 * 60 * 60);
  return Math.max(0, Math.round(hours * 10) / 10);
}

export async function requestAppleHealthPermissions(): Promise<AppleHealthConnectResult> {
  if (!isIOS()) {
    return { ok: false, reason: 'not_ios', message: 'Apple Health works only on iPhone.' };
  }

  if (isExpoGoRuntime()) {
    await setConnectedState(false);
    return {
      ok: false,
      reason: 'expo_go',
      message: 'You are running in Expo Go. Apple Health requires a custom development build.',
    };
  }

  try {
    const healthKit = await getHealthKitModule().catch(() => null);
    if (!isHealthKitModuleReady(healthKit)) {
      await setConnectedState(false);
      return {
        ok: false,
        reason: 'module_missing',
        message: 'HealthKit native module is not available or not initialized in this build.',
      };
    }

    const available = await checkAvailability(healthKit);
    if (!available) {
      await setConnectedState(false);
      return {
        ok: false,
        reason: 'healthkit_unavailable',
        message: 'HealthKit is unavailable on this device (simulator not supported).',
      };
    }

    const result = await initializeHealthKit(healthKit);

    await setConnectedState(result.ok);
    return result;
  } catch (error) {
    await setConnectedState(false);
    return {
      ok: false,
      reason: 'unknown',
      message: `Unexpected error while requesting Apple Health permissions: ${toErrorMessage(error)}`,
    };
  }
}

export async function hasAskedAppleHealthPermission(): Promise<boolean> {
  if (!isIOS()) return false;
  const value = await AsyncStorage.getItem(APPLE_HEALTH_PERMISSION_ASKED_KEY);
  return value === '1';
}

export async function getAppleHealthConnectionStatus(): Promise<boolean> {
  if (!isIOS()) {
    return false;
  }

  const value = await AsyncStorage.getItem(APPLE_HEALTH_CONNECTED_KEY);
  return value === '1';
}

export async function getAppleHealthLastSyncAt(): Promise<Date | null> {
  if (!isIOS()) {
    return null;
  }

  const raw = await AsyncStorage.getItem(APPLE_HEALTH_LAST_SYNC_KEY);
  return ensureDate(raw);
}

export async function getAppleHealthTodaySummary(): Promise<AppleHealthTodaySummary | null> {
  if (!isIOS()) {
    return null;
  }

  try {
    const healthKit = await getHealthKitModule();

    if (!isHealthKitModuleReady(healthKit)) {
      await setConnectedState(false);
      return null;
    }

    const available = await checkAvailability(healthKit);
    if (!available) {
      await setConnectedState(false);
      return null;
    }

    const initialized = await initializeHealthKit(healthKit);
    if (!initialized.ok) {
      await setConnectedState(false);
      return null;
    }

    const [steps, activeCalories, sleepHours] = await Promise.all([
      getTodayStepCount(healthKit),
      getTodayActiveCalories(healthKit),
      getTodaySleepHours(healthKit),
    ]);

    await setConnectedState(true);
    await setLastSync(new Date());

    return { steps, activeCalories, sleepHours };
  } catch {
    await setConnectedState(false);
    return null;
  }
}

export async function logTakenDoseToAppleHealth(payload: DoseSyncPayload): Promise<boolean> {
  if (!isIOS()) {
    return false;
  }

  const connected = await getAppleHealthConnectionStatus();
  if (!connected) {
    return false;
  }

  try {
    const healthKit = await getHealthKitModule();
    if (!isHealthKitModuleReady(healthKit)) {
      await setConnectedState(false);
      return false;
    }

    const available = await checkAvailability(healthKit);
    if (!available) {
      await setConnectedState(false);
      return false;
    }

    const initialized = await initializeHealthKit(healthKit);
    if (!initialized.ok) {
      await setConnectedState(false);
      return false;
    }

    const startDate = payload.loggedAt ?? new Date();
    const endDate = new Date(startDate.getTime() + 60_000);

    await new Promise<void>((resolve, reject) => {
      healthKit.saveMindfulSession(
        {
          value: 1,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          metadata: {
            HKWasUserEntered: true,
            medmatesDoseStatus: 'taken',
            medmatesMedicationId: payload.medId,
            medmatesMedicationName: payload.medName,
            medmatesDosage: `${payload.dosage} ${payload.unit}`,
          },
        },
        (error: string | null) => {
          if (error) {
            reject(new Error(error));
            return;
          }
          resolve();
        },
      );
    });

    await setLastSync(new Date());
    return true;
  } catch {
    return false;
  }
}
