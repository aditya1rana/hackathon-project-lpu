# SalahLock — Full Stack MVP

An app that helps Muslims stay disciplined with Salah by locking social media apps during prayer time. Built with React Native (Expo) + Firebase.

---

## Quick Start (Run the App)

```bash
cd salah-lock
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your phone.

---

## Project Structure

```
salah-lock/
├── App.tsx                       # App entry point
├── firebase.json                 # Firebase project config
├── firestore.rules               # Firestore security rules
│
├── src/                          # React Native frontend
│   ├── components/               # Reusable UI (Button, PrayerCard, ScreenWrapper)
│   ├── navigation/               # React Navigation setup
│   ├── screens/                  # All 7 app screens
│   ├── services/firebase.ts      # Firebase init + Firestore helper functions
│   ├── store/useAppStore.ts      # Zustand global state + async actions
│   ├── theme/colors.ts           # Design system colors
│   └── types/index.ts            # TypeScript interfaces (shared with backend)
│
└── functions/                    # Firebase Cloud Functions (server-side)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts              # Barrel file (initialises admin SDK)
        ├── onUserCreate.ts       # Auth trigger: auto-creates user docs
        ├── fetchPrayerTimes.ts   # Scheduled: fetches AlAdhan prayer times daily
        ├── sendPrayerNotifications.ts  # Scheduled: sends FCM push every 5 min
        ├── updatePrayerStreak.ts # Scheduled: calculates streak nightly
        └── stripeWebhook.ts      # HTTPS: handles Stripe subscription events
```

---

## Step-by-Step Deployment Guide

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** → name it `salahlock` → create it
3. Copy the **Web app** config (apiKey, authDomain, etc.)
4. Paste it into `src/services/firebase.ts` replacing the `"YOUR_..."` placeholders

### 3. Enable Google Authentication

1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Google** provider
3. Add your support email

### 4. Enable Firestore

1. Firebase Console → **Firestore Database** → **Create database**
2. Start in **production mode** (our security rules will protect data)

### 5. Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### 6. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build          # compiles TypeScript
cd ..
firebase deploy --only functions
```

### 7. Set Stripe Secrets (for Premium Subscriptions)

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```
Then add your deployed `stripeWebhook` URL as a webhook endpoint in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks).

### 8. Enable Firebase Cloud Messaging (FCM)

1. Firebase Console → **Cloud Messaging**
2. In your React Native app, register for push notifications using `expo-notifications` and store the FCM token in Firestore:
   ```ts
   import { updateUserProfile } from './services/firebase';
   // After getting the token:
   await updateUserProfile(uid, { fcmToken: token });
   ```

---

## Firestore Collections

| Collection | Doc ID | Description |
|---|---|---|
| `users` | `{uid}` | Profile, streak, city, timezone, fcmToken |
| `prayer_times` | `{uid}_{date}` | Daily prayer times from AlAdhan API |
| `prayer_logs` | auto-id | One entry per prayer marked as completed |
| `blocking_settings` | `{uid}` | Which apps to block, duration, enabled flag |
| `subscriptions` | `{uid}` | Stripe plan, status, renewal date |

---

## Cloud Functions Summary

| Function | Trigger | What It Does |
|---|---|---|
| `onUserCreate` | Auth signup | Creates user profile + default settings |
| `fetchPrayerTimes` | Daily at midnight UTC | Calls AlAdhan API, saves times to Firestore |
| `sendPrayerNotifications` | Every 5 minutes | Sends FCM push when a prayer is starting |
| `updatePrayerStreak` | Daily at 1 AM UTC | Checks yesterday's logs, updates streak |
| `stripeWebhook` | Stripe HTTP POST | Updates subscription status in Firestore |

---

## Tech Stack

- **Frontend:** React Native + Expo + TypeScript
- **Styling:** NativeWind (TailwindCSS)
- **Navigation:** React Navigation
- **State:** Zustand
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, FCM)
- **Payments:** Stripe
- **Prayer Times:** AlAdhan API
