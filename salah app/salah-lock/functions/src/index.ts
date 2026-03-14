/**
 * index.ts  —  Cloud Functions barrel file
 *
 * This is the single entry point Firebase reads when deploying functions.
 * It re-exports every function so Firebase discovers them automatically.
 *
 * Initialize firebase-admin here once so every function can use it.
 */

import * as admin from "firebase-admin";

// Initialize the Admin SDK (only once, at the top level)
admin.initializeApp();

// Re-export all Cloud Functions
export { onUserCreate } from "./onUserCreate";
export { fetchPrayerTimes } from "./fetchPrayerTimes";
export { sendPrayerNotifications } from "./sendPrayerNotifications";
export { updatePrayerStreak } from "./updatePrayerStreak";
export { stripeWebhook } from "./stripeWebhook";
