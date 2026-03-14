"use strict";
/**
 * index.ts  —  Cloud Functions barrel file
 *
 * This is the single entry point Firebase reads when deploying functions.
 * It re-exports every function so Firebase discovers them automatically.
 *
 * Initialize firebase-admin here once so every function can use it.
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
exports.stripeWebhook = exports.updatePrayerStreak = exports.sendPrayerNotifications = exports.fetchPrayerTimes = exports.onUserCreate = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize the Admin SDK (only once, at the top level)
admin.initializeApp();
// Re-export all Cloud Functions
var onUserCreate_1 = require("./onUserCreate");
Object.defineProperty(exports, "onUserCreate", { enumerable: true, get: function () { return onUserCreate_1.onUserCreate; } });
var fetchPrayerTimes_1 = require("./fetchPrayerTimes");
Object.defineProperty(exports, "fetchPrayerTimes", { enumerable: true, get: function () { return fetchPrayerTimes_1.fetchPrayerTimes; } });
var sendPrayerNotifications_1 = require("./sendPrayerNotifications");
Object.defineProperty(exports, "sendPrayerNotifications", { enumerable: true, get: function () { return sendPrayerNotifications_1.sendPrayerNotifications; } });
var updatePrayerStreak_1 = require("./updatePrayerStreak");
Object.defineProperty(exports, "updatePrayerStreak", { enumerable: true, get: function () { return updatePrayerStreak_1.updatePrayerStreak; } });
var stripeWebhook_1 = require("./stripeWebhook");
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripeWebhook_1.stripeWebhook; } });
//# sourceMappingURL=index.js.map