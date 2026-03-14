// ─────────────────────────────────────────────────────────────
// store/useAppStore.ts  —  Zustand global state + async actions
//
// This is the single source of truth for the React Native app.
// It holds the current user, prayer times, logs, settings, and
// subscription. The "load*" actions fetch data from Firestore
// (or demo stubs) using the helpers in firebase.ts.
// ─────────────────────────────────────────────────────────────

import { create } from "zustand";
import {
    User,
    PrayerTimes,
    PrayerLog,
    BlockingSettings,
    Subscription,
} from "../types";
import {
    fetchUserProfile,
    fetchPrayerTimes as fetchPT,
    fetchTodayPrayerLogs,
    fetchBlockingSettings as fetchBS,
    fetchSubscription as fetchSub,
    savePrayerLog as savePL,
    saveBlockingSettings as saveBS,
    updateUserProfile,
} from "../services/firebase";

// ── State Shape ───────────────────────────────────────────────
interface AppState {
    // Data
    user: User | null;
    prayerTimes: PrayerTimes | null;
    todayLogs: PrayerLog[];
    blockingSettings: BlockingSettings | null;
    subscription: Subscription | null;

    // UI
    isLoading: boolean;
    isLocked: boolean;

    // Derived
    prayersCompletedToday: number;

    // Setters (for immediate local updates)
    setUser: (user: User | null) => void;
    checkLockStatus: () => void;
    setLoading: (loading: boolean) => void;

    // Async actions that talk to Firestore
    loadUserProfile: (uid: string) => Promise<void>;
    loadPrayerTimes: (uid: string) => Promise<void>;
    loadTodayLogs: (uid: string) => Promise<void>;
    loadBlockingSettings: (uid: string) => Promise<void>;
    loadSubscription: (uid: string) => Promise<void>;
    loadAll: (uid: string) => Promise<void>;

    // New: Refresh location and save to profile
    refreshLocation: (uid: string) => Promise<void>;
    scheduleNotifications: () => Promise<void>;

    // Write actions
    markPrayerCompleted: (uid: string, prayerName: string) => Promise<void>;
    updateBlockingSettings: (
        uid: string,
        data: Partial<BlockingSettings>
    ) => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set, get) => ({
    // Initial state
    user: null,
    prayerTimes: null,
    todayLogs: [],
    blockingSettings: null,
    subscription: null,
    isLoading: false,
    isLocked: false,
    prayersCompletedToday: 0,

    // Simple setters
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading }),

    // UI Actions
    checkLockStatus: () => {
        try {
            const { prayerTimes, blockingSettings } = get();
            if (!prayerTimes || !blockingSettings) {
                set({ isLocked: false });
                return;
            }
            const { isCurrentlyLocked } = require('../services/blocking');
            const locked = isCurrentlyLocked(prayerTimes, blockingSettings);
            set({ isLocked: locked });

            // Native Blocking — keep the service running with prayer times
            // The service auto-schedules blocking, alarm, and notification
            try {
                const SalahLock = require('../native/SalahLock').default;
                if (!SalahLock) return;
                if (blockingSettings?.blockingEnabled) {
                    const packages = blockingSettings.blockedPackages || [];
                    const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
                    const times = [
                        prayerTimes.fajr,
                        prayerTimes.dhuhr,
                        prayerTimes.asr,
                        prayerTimes.maghrib,
                        prayerTimes.isha,
                    ];
                    SalahLock.startBlocking(
                        packages,
                        blockingSettings.lockDuration || 20,
                        names,
                        times
                    );
                } else {
                    SalahLock.stopBlocking();
                }
            } catch (e) {
                // Silently fail if native module not available
            }
        } catch (e) {
            // Silently handle any errors during lock status check
            set({ isLocked: false });
        }
    },

    // ── Async: load user profile ──
    loadUserProfile: async (uid) => {
        try {
            const user = await fetchUserProfile(uid);
            if (user) set({ user });
        } catch (e) {
            console.warn("loadUserProfile failed:", e);
        }
    },

    // ── Async: load today's prayer times ──
    loadPrayerTimes: async (uid) => {
        try {
            const state = get();
            let times: any = null;

            // If we have user coordinates, calculate locally
            if (state.user?.latitude && state.user?.longitude) {
                const { calculateLocalPrayerTimes } = await import('../services/prayerTimes');
                const localTimes = calculateLocalPrayerTimes(
                    state.user.latitude,
                    state.user.longitude
                );
                times = { ...localTimes, userId: uid };
            } else {
                // Try Firestore, fallback to null
                times = await fetchPT(uid);
            }

            // Apply custom prayer time overrides if enabled
            if (times) {
                const custom = state.blockingSettings?.customPrayerTimes;
                if (custom?.enabled) {
                    if (custom.fajr) times.fajr = custom.fajr;
                    if (custom.dhuhr) times.dhuhr = custom.dhuhr;
                    if (custom.asr) times.asr = custom.asr;
                    if (custom.maghrib) times.maghrib = custom.maghrib;
                    if (custom.isha) times.isha = custom.isha;
                }
            }

            set({ prayerTimes: times });
        } catch (e) {
            console.warn("loadPrayerTimes failed:", e);
        }
    },

    // ── Refresh location ──
    refreshLocation: async (uid) => {
        set({ isLoading: true });
        try {
            const { getCurrentLocation } = await import('../services/location');
            const loc = await getCurrentLocation();
            if (loc) {
                const currentUser = get().user;
                if (currentUser) {
                    const updatedUser: User = {
                        ...currentUser,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        city: loc.city || currentUser.city,
                    };
                    set({ user: updatedUser });
                    try {
                        await updateUserProfile(uid, {
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            city: loc.city || currentUser.city,
                        });
                    } catch (e) {
                        // Firebase not configured — skip save
                    }
                    await get().loadPrayerTimes(uid);
                }
            }
        } catch (error: any) {
            console.error('refreshLocation failed:', error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    // ── Schedule notifications ──
    scheduleNotifications: async () => {
        try {
            const { prayerTimes } = get();
            if (prayerTimes) {
                const { schedulePrayerNotifications } = await import('../services/notifications');
                await schedulePrayerNotifications(prayerTimes);
            }
        } catch (e) {
            console.warn("scheduleNotifications failed:", e);
        }
    },

    // ── Async: load today's prayer logs ──
    loadTodayLogs: async (uid) => {
        try {
            const todayLogs = await fetchTodayPrayerLogs(uid);
            set({
                todayLogs,
                prayersCompletedToday: todayLogs.filter((l) => l.completed).length,
            });
        } catch (e) {
            console.warn("loadTodayLogs failed:", e);
        }
    },

    // ── Async: load blocking settings ──
    loadBlockingSettings: async (uid) => {
        try {
            const blockingSettings = await fetchBS(uid);
            set({ blockingSettings });
        } catch (e) {
            console.warn("loadBlockingSettings failed:", e);
        }
    },

    // ── Async: load subscription ──
    loadSubscription: async (uid) => {
        try {
            const subscription = await fetchSub(uid);
            set({ subscription });
        } catch (e) {
            console.warn("loadSubscription failed:", e);
        }
    },

    // ── Async: load everything at once (used after login) ──
    loadAll: async (uid) => {
        set({ isLoading: true });
        try {
            const state = get();
            await state.loadUserProfile(uid);
            await Promise.all([
                state.loadPrayerTimes(uid),
                state.loadTodayLogs(uid),
                state.loadBlockingSettings(uid),
                state.loadSubscription(uid),
            ]);
        } catch (e) {
            console.warn("loadAll failed:", e);
        } finally {
            set({ isLoading: false });
        }
    },

    // ── Write: mark a prayer as completed ──
    markPrayerCompleted: async (uid, prayerName) => {
        try {
            await savePL(uid, prayerName);
        } catch (e) {
            // Firebase stub — save locally instead
        }
        // Update local state immediately for responsive UI
        const todayLogs = get().todayLogs;
        const newLog: PrayerLog = {
            userId: uid,
            prayerName,
            date: new Date().toISOString().split('T')[0],
            completed: true,
            timestamp: new Date().toISOString(),
        };
        const updatedLogs = [...todayLogs, newLog];
        set({
            todayLogs: updatedLogs,
            prayersCompletedToday: updatedLogs.filter((l) => l.completed).length,
        });
    },

    // ── Write: update blocking settings ──
    updateBlockingSettings: async (uid, data) => {
        // Update local state immediately
        const current = get().blockingSettings;
        if (current) {
            set({ blockingSettings: { ...current, ...data } as BlockingSettings });
        }
        try {
            await saveBS(uid, data);
        } catch (e) {
            // Firebase stub — local update already applied
        }
    },
}));
