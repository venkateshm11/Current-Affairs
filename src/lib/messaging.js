// Firebase Cloud Messaging (web push) — client-side only.
//
// Contract (phase-6.md / golden-rules.md):
//  - VAPID key and Firebase config come from import.meta.env.VITE_* — nothing hardcoded here.
//  - The committed service worker (public/firebase-messaging-sw.js) carries NO config literals;
//    it reads the Firebase config from its own registration URL query params, which we build
//    from import.meta.env below. The Firebase web config is public by design (not a secret).
//  - The FCM token is never logged. It is returned to the caller, which writes it to
//    users/{uid}.fcmToken (uid-scoped) via the firestore helper.
//  - getMessaging() resolves the default Firebase app via getApp() — src/lib/firebase.js untouched.

import { getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

// Firebase web config, sourced entirely from environment variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// True when the browser supports FCM web push (guards Safari/unsupported environments).
export function isMessagingSupported() {
  return isSupported();
}

// Register the messaging service worker, passing the Firebase config as query params so the
// committed SW file needs no hardcoded config. Same-origin registration only.
async function registerMessagingSw() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (value) params.set(key, value);
  }
  return navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${params.toString()}`,
  );
}

// Request an FCM registration token for this device. The VAPID key comes from the environment.
// Returns the token string (or null if none was issued). Never logs the token.
export async function getFcmToken(vapidKey) {
  const registration = await registerMessagingSw();
  const messaging = getMessaging(getApp());
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}
