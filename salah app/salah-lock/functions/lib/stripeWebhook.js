"use strict";
/**
 * stripeWebhook.ts
 *
 * An HTTPS Cloud Function that Stripe calls whenever a subscription
 * event happens (new signup, renewal, cancellation, etc.).
 *
 * It verifies the webhook signature for security, then updates the
 * `subscriptions` and `users` collections in Firestore.
 *
 * Setup:
 *   1. Create a Stripe account and get your secret key + webhook signing secret.
 *   2. Store them as Firebase environment config:
 *        firebase functions:secrets:set STRIPE_SECRET_KEY
 *        firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *   3. In the Stripe dashboard, add your deployed function URL as a webhook endpoint.
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
exports.stripeWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// These are read from Firebase Secrets at runtime
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
exports.stripeWebhook = functions
    .runWith({
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
})
    .https.onRequest(async (req, res) => {
    var _a;
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const stripe = new stripe_1.default(stripeSecretKey, { apiVersion: "2024-04-10" });
    const sig = req.headers["stripe-signature"];
    let event;
    // Step 1: Verify the webhook signature
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        functions.logger.error("Webhook signature verification failed:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    const db = admin.firestore();
    // Step 2: Handle different event types
    switch (event.type) {
        // ---- New subscription created ----
        case "checkout.session.completed": {
            const session = event.data.object;
            const uid = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.firebaseUID;
            if (!uid)
                break;
            await db.collection("subscriptions").doc(uid).update({
                plan: "premium",
                status: "active",
                stripeCustomerId: session.customer,
                startDate: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection("users").doc(uid).update({
                subscriptionStatus: "premium",
            });
            functions.logger.info(`Activated premium for user ${uid}`);
            break;
        }
        // ---- Recurring payment succeeded ----
        case "invoice.paid": {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            // Find the user by stripeCustomerId
            const snap = await db
                .collection("subscriptions")
                .where("stripeCustomerId", "==", customerId)
                .limit(1)
                .get();
            if (!snap.empty) {
                const subDoc = snap.docs[0];
                await subDoc.ref.update({
                    status: "active",
                    renewalDate: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            break;
        }
        // ---- Subscription cancelled ----
        case "customer.subscription.deleted": {
            const sub = event.data.object;
            const customerId = sub.customer;
            const snap = await db
                .collection("subscriptions")
                .where("stripeCustomerId", "==", customerId)
                .limit(1)
                .get();
            if (!snap.empty) {
                const subDoc = snap.docs[0];
                const uid = subDoc.data().userId;
                await subDoc.ref.update({ plan: "free", status: "cancelled" });
                await db.collection("users").doc(uid).update({
                    subscriptionStatus: "free",
                });
                functions.logger.info(`Cancelled premium for user ${uid}`);
            }
            break;
        }
        default:
            functions.logger.info(`Unhandled event type: ${event.type}`);
    }
    res.status(200).json({ received: true });
});
//# sourceMappingURL=stripeWebhook.js.map