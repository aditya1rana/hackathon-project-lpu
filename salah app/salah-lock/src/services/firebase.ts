// ─────────────────────────────────────────────────────────────
// services/firebase.ts  —  Firebase init + Firestore helpers
//
// DEMO MODE: Firebase config is placeholder. All functions
// return mock/fallback data so the app works without a real
// Firebase project connected.
// ─────────────────────────────────────────────────────────────

import {
    User,
    PrayerTimes,
    PrayerLog,
    BlockingSettings,
    Subscription,
} from "../types";

// ── Firebase is NOT configured yet ────────────────────────────
// When you're ready, uncomment the imports and initialization below,
// replace the config values, and remove the mock implementations.

// import { initializeApp } from "firebase/app";
// import { getAuth, signOut as firebaseSignOut } from "firebase/auth";
// import { getFirestore, doc, getDoc, ... } from "firebase/firestore";
//
// const firebaseConfig = {
//     apiKey: "YOUR_API_KEY",
//     authDomain: "YOUR_AUTH_DOMAIN",
//     projectId: "YOUR_PROJECT_ID",
//     storageBucket: "YOUR_STORAGE_BUCKET",
//     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//     appId: "YOUR_APP_ID",
// };
//
// const app = initializeApp(firebaseConfig);
// export const auth = getAuth(app);
// export const db = getFirestore(app);

// ── 2. Authentication (Demo stubs) ───────────────────────────

export async function signInWithGoogle(idToken?: string) {
    // Stub — returns a mock user
    if (idToken) {
        console.log("signInWithGoogle stub called WITH REAL ID TOKEN! Auth successful via Native Google Sign-In.");
    } else {
        console.log("signInWithGoogle stub called with NO token (Fallback/Guest).");
    }
    return { uid: "demo-user", email: "user@example.com" };
}

export async function signOutUser() {
    console.log("signOutUser stub called");
}

// ── 3. Firestore Helpers (Demo stubs) ────────────────────────

export async function fetchUserProfile(uid: string): Promise<User | null> {
    return null; // No profile in demo mode
}

export async function updateUserProfile(
    uid: string,
    data: Partial<User>
): Promise<void> {
    console.log("updateUserProfile stub:", uid, data);
}

export async function fetchPrayerTimes(
    uid: string
): Promise<PrayerTimes | null> {
    return null; // Will use local calculation instead
}

export async function fetchTodayPrayerLogs(
    uid: string
): Promise<PrayerLog[]> {
    return []; // No logs in demo mode
}

export async function savePrayerLog(
    uid: string,
    prayerName: string
): Promise<void> {
    console.log("savePrayerLog stub:", uid, prayerName);
}

export async function fetchBlockingSettings(
    uid: string
): Promise<BlockingSettings | null> {
    // Return default settings with real Android package names
    return {
        userId: uid,
        blockedApps: ['Instagram', 'TikTok'],
        blockedPackages: ['com.instagram.android', 'com.zhiliaoapp.musically'],
        customApps: [],
        customPackages: [],
        lockDuration: 20,
        blockingEnabled: true,
    };
}

export async function saveBlockingSettings(
    uid: string,
    data: Partial<BlockingSettings>
): Promise<void> {
    console.log("saveBlockingSettings stub:", uid, data);
}

export async function fetchSubscription(
    uid: string
): Promise<Subscription | null> {
    return null; // Free tier in demo mode
}
