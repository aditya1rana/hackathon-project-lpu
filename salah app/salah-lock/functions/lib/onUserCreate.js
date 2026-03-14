"use strict";
/**
 * onUserCreate.ts
 *
 * Firebase Auth trigger that runs every time a new user signs up.
 * It automatically creates three Firestore documents for the new user:
 *   1. A profile in the `users` collection
 *   2. Default blocking settings in `blocking_settings`
 *   3. A free subscription record in `subscriptions`
 *
 * This means the app never has to worry about "first-time setup" —
 * everything is ready the moment the user logs in.
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
exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const db = admin.firestore();
    const uid = user.uid;
    // 1) Create the user profile document
    await db.collection("users").doc(uid).set({
        id: uid,
        email: user.email || "",
        streak: 0,
        city: "", // user sets this later in the app
        timezone: "", // user sets this later in the app
        subscriptionStatus: "free",
        fcmToken: "", // stored when the app registers for push notifications
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 2) Create default blocking settings
    await db.collection("blocking_settings").doc(uid).set({
        userId: uid,
        blockedApps: ["Instagram", "TikTok", "Twitter"], // sensible defaults
        lockDuration: 20, // 20 minutes
        blockingEnabled: true,
    });
    // 3) Create a free subscription record
    await db.collection("subscriptions").doc(uid).set({
        userId: uid,
        plan: "free",
        status: "active",
        stripeCustomerId: "",
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        renewalDate: null,
    });
    functions.logger.info(`Created profile docs for new user ${uid}`);
});
//# sourceMappingURL=onUserCreate.js.map