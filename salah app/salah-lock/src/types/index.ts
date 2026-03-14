// ─────────────────────────────────────────────────────────────
// types/index.ts  —  Shared TypeScript interfaces
// ─────────────────────────────────────────────────────────────

// ── User Profile ──────────────────────────────────────────────
export interface User {
    id: string;
    name?: string;
    email: string;
    streak: number;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    subscriptionStatus: "free" | "premium";
    fcmToken?: string;
    createdAt: string;
}

// ── Prayer Times (one document per user per day) ──────────────
export interface PrayerTimes {
    userId: string;
    fajr: string;   // "HH:mm" format
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    date?: string;    // "YYYY-MM-DD"
}

// ── Custom Prayer Times override ──────────────────────────────
export interface CustomPrayerTimes {
    enabled: boolean;
    fajr?: string;
    dhuhr?: string;
    asr?: string;
    maghrib?: string;
    isha?: string;
}

// ── Prayer Log (one entry per prayer per day) ─────────────────
export interface PrayerLog {
    userId: string;
    prayerName: string;  // "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha"
    date: string;        // "YYYY-MM-DD"
    completed: boolean;
    timestamp: string;
}

// ── Blocking Settings (one per user) ──────────────────────────
export interface BlockingSettings {
    userId: string;
    blockedApps: string[];          // display names
    blockedPackages: string[];      // Android package names (e.g. com.instagram.android)
    customApps: string[];           // user-added app names
    customPackages: string[];       // user-added package names
    lockDuration: number;           // minutes (10–60)
    blockingEnabled: boolean;
    customPrayerTimes?: CustomPrayerTimes;
}

// ── Subscription (one per user) ───────────────────────────────
export interface Subscription {
    userId: string;
    plan: "free" | "premium";
    status: "active" | "cancelled" | "past_due";
    stripeCustomerId: string;
    startDate: string;
    renewalDate: string | null;
}

// ── Navigation Types ──────────────────────────────────────────
export type RootStackParamList = {
    Splash: undefined;
    Onboarding: undefined;
    Login: undefined;
    NameInput: undefined;
    Main: undefined;
};

export type TabParamList = {
    Home: undefined;
    Prayer: undefined;
    Compass: undefined;
    Settings: undefined;
    Profile: undefined;
};
