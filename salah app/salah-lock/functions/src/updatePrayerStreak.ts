/**
 * updatePrayerStreak.ts
 *
 * Runs every day at 1:00 AM UTC.
 * For each user it checks *yesterday's* prayer_logs.
 *
 * Rules:
 *   - If the user completed ALL 5 prayers yesterday → streak += 1
 *   - If any prayer was missed → streak resets to 0
 *
 * This keeps the streak counter always up to date without the
 * frontend needing to calculate it.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const ALL_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export const updatePrayerStreak = functions.pubsub
    .schedule("0 1 * * *")  // 1:00 AM UTC every day
    .timeZone("UTC")
    .onRun(async () => {
        const db = admin.firestore();

        // Yesterday's date in "YYYY-MM-DD" format
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const usersSnap = await db.collection("users").get();

        for (const userDoc of usersSnap.docs) {
            const uid = userDoc.id;
            const currentStreak = (userDoc.data().streak as number) || 0;

            // Get yesterday's completed prayer logs for this user
            const logsSnap = await db
                .collection("prayer_logs")
                .where("userId", "==", uid)
                .where("date", "==", yesterdayStr)
                .where("completed", "==", true)
                .get();

            // Build a set of completed prayer names
            const completedSet = new Set<string>();
            for (const logDoc of logsSnap.docs) {
                completedSet.add(logDoc.data().prayerName as string);
            }

            // Check if ALL 5 prayers were completed
            const allCompleted = ALL_PRAYERS.every((p) => completedSet.has(p));

            const newStreak = allCompleted ? currentStreak + 1 : 0;

            await db.collection("users").doc(uid).update({ streak: newStreak });

            functions.logger.info(
                `User ${uid}: ${completedSet.size}/5 prayers yesterday → streak ${newStreak}`
            );
        }

        return null;
    });
