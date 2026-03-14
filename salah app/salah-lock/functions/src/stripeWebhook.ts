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

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// These are read from Firebase Secrets at runtime
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const stripeWebhook = functions
    .runWith({
        secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    })
    .https.onRequest(async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }

        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" as any });
        const sig = req.headers["stripe-signature"] as string;

        let event: Stripe.Event;

        // Step 1: Verify the webhook signature
        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        } catch (err: any) {
            functions.logger.error("Webhook signature verification failed:", err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        const db = admin.firestore();

        // Step 2: Handle different event types
        switch (event.type) {
            // ---- New subscription created ----
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const uid = session.metadata?.firebaseUID;
                if (!uid) break;

                await db.collection("subscriptions").doc(uid).update({
                    plan: "premium",
                    status: "active",
                    stripeCustomerId: session.customer as string,
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
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

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
                const sub = event.data.object as Stripe.Subscription;
                const customerId = sub.customer as string;

                const snap = await db
                    .collection("subscriptions")
                    .where("stripeCustomerId", "==", customerId)
                    .limit(1)
                    .get();

                if (!snap.empty) {
                    const subDoc = snap.docs[0];
                    const uid = subDoc.data().userId as string;

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
