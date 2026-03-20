/**
 * UI Store — Zustand store for transient UI state (toasts, in-app notifications, loading, sheets)
 */

import { create } from 'zustand';

// ──────────────────────────────────────────────
// Toast types
// ──────────────────────────────────────────────

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

// ──────────────────────────────────────────────
// In-app notification types (Dynamic Island)
// ──────────────────────────────────────────────

export type ReminderTier = 'pre_10' | 'pre_5' | 'main';
export type ReminderAction = 'taken' | 'snooze' | 'skip';

export interface InAppNotification {
  id: string;
  tier: ReminderTier;
  medId: string;
  medName: string;
  medColor?: string;
  dosage: string;
  unit: string;
  scheduledTime: string; // HH:mm
  respondedAction?: ReminderAction;
}

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

interface UIState {
  // Toasts
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  // In-app notifications (Dynamic Island)
  inAppNotifications: InAppNotification[];
  showInAppNotification: (notification: Omit<InAppNotification, 'id'>) => void;
  dismissInAppNotification: (id: string) => void;
  respondInAppNotification: (id: string, action: ReminderAction) => void;
  /** Callback invoked when user responds to a main reminder */
  onReminderResponse: ((medId: string, time: string, action: ReminderAction) => void) | null;
  setOnReminderResponse: (
    cb: ((medId: string, time: string, action: ReminderAction) => void) | null,
  ) => void;

  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Active bottom sheet
  activeSheet: string | null;
  openSheet: (id: string) => void;
  closeSheet: () => void;

  // Mates UI flags
  discoverBannerDismissed: boolean;
  setDiscoverBannerDismissed: (dismissed: boolean) => void;
}

let toastCounter = 0;
let notifCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  // ─── Toasts ───
  toasts: [],
  showToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // ─── In-app Notifications ───
  inAppNotifications: [],
  showInAppNotification: (notification) => {
    const id = `notif-${++notifCounter}`;
    set((state) => ({
      inAppNotifications: [...state.inAppNotifications, { ...notification, id }],
    }));
  },
  dismissInAppNotification: (id) =>
    set((state) => ({
      inAppNotifications: state.inAppNotifications.filter((n) => n.id !== id),
    })),
  respondInAppNotification: (id, action) => {
    const state = get();
    const notif = state.inAppNotifications.find((n) => n.id === id);
    if (notif && state.onReminderResponse) {
      state.onReminderResponse(notif.medId, notif.scheduledTime, action);
    }
    set((s) => ({
      inAppNotifications: s.inAppNotifications.filter((n) => n.id !== id),
    }));
  },
  onReminderResponse: null,
  setOnReminderResponse: (cb) => set({ onReminderResponse: cb }),

  // ─── Global loading ───
  globalLoading: false,
  setGlobalLoading: (globalLoading) => set({ globalLoading }),

  // ─── Active sheet ───
  activeSheet: null,
  openSheet: (id) => set({ activeSheet: id }),
  closeSheet: () => set({ activeSheet: null }),

  // ─── Mates flags ───
  discoverBannerDismissed: false,
  setDiscoverBannerDismissed: (dismissed) => set({ discoverBannerDismissed: dismissed }),
}));
