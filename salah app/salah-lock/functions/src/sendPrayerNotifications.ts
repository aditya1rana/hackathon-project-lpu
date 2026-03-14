/**
 * sendPrayerNotifications.ts
 *
 * Runs every 5 minutes. For each user, it checks whether any prayer
 * is starting in the current 5-minute window and, if so, sends an
 * FCM push notification to the user's device.
 *
 * The notification text encourages the user to stop scrolling and pray.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Friendly notification messages — one is picked at random
const MESSAGES: string[] = [
    "Time to pray. Pause the scroll.",
    "Allah is calling. Put the phone down.",
    "Your Salah is more important than any feed.",
    "Stop scrolling. Start praying.",
    "The best investment of your time — Salah.",
];

/**
 * Convert an "HH:mm" string into total minutes since midnight.
 */
function timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

export const sendPrayerNotifications = functions.pubsub
    .schedule("every 5 minutes")
    .timeZone("UTC")
    .onRun(async () => {
        const db = admin.firestore();
        const now = new Date();
        const today = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

        // Current time in minutes (UTC).
        // For a production app you'd convert to the user's timezone.
        const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

        // Get today's prayer_times documents
        const ptSnap = await db
            .collection("prayer_times")
            .where("date", "==", today)
            .get();

        if (ptSnap.empty) return null;

        const prayerNames = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

        for (const ptDoc of ptSnap.docs) {
            const pt = ptDoc.data();
            const userId = pt.userId as string;

            for (const name of prayerNames) {
                const prayerTimeStr = pt[name] as string | undefined;
                if (!prayerTimeStr) continue;

                const prayerMinutes = timeToMinutes(prayerTimeStr);

                // If the prayer starts in the current 5-minute window, send a notification
                if (prayerMinutes >= nowMinutes && prayerMinutes < nowMinutes + 5) {
                    // Get the user's FCM token
                    const userDoc = await db.collection("users").doc(userId).get();
                    const fcmToken = userDoc.data()?.fcmToken as string | undefined;

                    if (!fcmToken) continue;

                    const randomMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

                    try {
                        await admin.messaging().send({
                            token: fcmToken,
                            notification: {
                                title: `${name.charAt(0).toUpperCase() + name.slice(1)} Time`,
                                body: randomMsg,
                            },
                            data: {
                                prayerName: name,
                                action: "lock_apps",  // the app can read this to trigger blocking
                            },
                        });
                        functions.logger.info(`Sent notification to ${userId} for ${name}`);
                    } catch (err) {
                        functions.logger.error(`FCM send failed for ${userId}:`, err);
                    }
                }
            }
        }

        return null;
    });
