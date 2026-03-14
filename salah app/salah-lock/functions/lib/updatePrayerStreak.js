"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePrayerStreak = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ALL_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
exports.updatePrayerStreak = functions.pubsub
    .schedule("0 1 * * *") // 1:00 AM UTC every day
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
        const currentStreak = userDoc.data().streak || 0;
        // Get yesterday's completed prayer logs for this user
        const logsSnap = await db
            .collection("prayer_logs")
            .where("userId", "==", uid)
            .where("date", "==", yesterdayStr)
            .where("completed", "==", true)
            .get();
        // Build a set of completed prayer names
        const completedSet = new Set();
        for (const logDoc of logsSnap.docs) {
            completedSet.add(logDoc.data().prayerName);
        }
        // Check if ALL 5 prayers were completed
        const allCompleted = ALL_PRAYERS.every((p) => completedSet.has(p));
        const newStreak = allCompleted ? currentStreak + 1 : 0;
        await db.collection("users").doc(uid).update({ streak: newStreak });
        functions.logger.info(`User ${uid}: ${completedSet.size}/5 prayers yesterday → streak ${newStreak}`);
    }
    return null;
});
//# sourceMappingURL=updatePrayerStreak.js.map