"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPrayerTimes = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Runs every day at 00:00 UTC.
 * For production you might run it multiple times to handle different timezones.
 */
exports.fetchPrayerTimes = functions.pubsub
    .schedule("0 0 * * *") // cron: midnight UTC every day
    .timeZone("UTC")
    .onRun(async () => {
    var _a;
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
        const city = userData.city;
        const country = userData.country || ""; // optional
        try {
            // Call the AlAdhan API
            const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}` +
                (country ? `&country=${encodeURIComponent(country)}` : "") +
                `&method=2`; // method 2 = ISNA (common default)
            const response = await (0, node_fetch_1.default)(url);
            const json = await response.json();
            if (json.code !== 200 || !((_a = json.data) === null || _a === void 0 ? void 0 : _a.timings)) {
                functions.logger.warn(`AlAdhan error for ${city}:`, json);
                continue;
            }
            const t = json.data.timings;
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
        }
        catch (err) {
            functions.logger.error(`Failed to fetch times for user ${userDoc.id}:`, err);
        }
    }
    return null;
});
//# sourceMappingURL=fetchPrayerTimes.js.map