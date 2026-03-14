/**
 * fetchPrayerTimes.ts
 *
 * Scheduled Cloud Function that runs once daily at midnight UTC.
 * For every user in the `users` collection that has a `city` set,
 * it calls the free AlAdhan API to get today's prayer times and
 * stores them in the `prayer_times` collection.
 *
 * API docs: https://aladhan.com/prayer-times-api
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

// The 5 daily prayers we care about
interface AlAdhanTimings {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
}

/**
 * Runs every day at 00:00 UTC.
 * For production you might run it multiple times to handle different timezones.
 */
export const fetchPrayerTimes = functions.pubsub
    .schedule("0 0 * * *")           // cron: midnight UTC every day
    .timeZone("UTC")
    .onRun(async () => {
        const db = admin.firestore();

        // Get all users who have set a city
        const usersSnap = await db
            .collection("users")
            .where("city", "!=", "")
            .get();

        if (usersSnap.empty) {
            functions.logger.info("No users with a city set. Skipping.");
            return null;
        }

        const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            const city = userData.city as string;
            const country = (userData.country as string) || ""; // optional

            try {
                // Call the AlAdhan API
                const url =
                    `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}` +
                    (country ? `&country=${encodeURIComponent(country)}` : "") +
                    `&method=2`; // method 2 = ISNA (common default)

                const response = await fetch(url);
                const json = await response.json() as any;

                if (json.code !== 200 || !json.data?.timings) {
                    functions.logger.warn(`AlAdhan error for ${city}:`, json);
                    continue;
                }

                const t: AlAdhanTimings = json.data.timings;

                // Write to Firestore: one document per user per day
                const docId = `${userDoc.id}_${today}`;
                await db.collection("prayer_times").doc(docId).set({
                    userId: userDoc.id,
                    fajr: t.Fajr,
                    dhuhr: t.Dhuhr,
                    asr: t.Asr,
                    maghrib: t.Maghrib,
                    isha: t.Isha,
                    date: today,
                });

                functions.logger.info(`Saved prayer times for user ${userDoc.id} (${city})`);
            } catch (err) {
                functions.logger.error(`Failed to fetch times for user ${userDoc.id}:`, err);
            }
        }

        return null;
    });
