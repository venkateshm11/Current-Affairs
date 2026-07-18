/* Firebase Cloud Messaging background service worker.
 *
 * This file is committed with NO hardcoded Firebase config. The app registers it with the
 * Firebase web config supplied as URL query params (built from import.meta.env in
 * src/lib/messaging.js), and the worker reads that config from its own location below.
 * The Firebase web config is public by design; no secret and no Gemini key is ever placed here.
 */
/* global importScripts, firebase */

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

const params = new URL(self.location).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    // Fixed, non-PII copy. Nothing from the payload identifies the user.
    const title = payload?.notification?.title || 'Current Affairs';
    const body =
      payload?.notification?.body || "Today's content not generated yet";
    self.registration.showNotification(title, { body, icon: '/pwa-icon.svg' });
  });
}

// Clicking the notification opens the daily feed (app root) — no auth state in the URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
