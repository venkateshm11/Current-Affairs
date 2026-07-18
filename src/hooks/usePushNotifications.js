import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { setFcmToken } from '../lib/firestore';
import { getFcmToken, isMessagingSupported } from '../lib/messaging';

// Raised when the browser blocks or the user denies notification permission.
export class NotificationPermissionError extends Error {
  constructor(message) {
    super(message || 'Notification permission not granted');
    this.name = 'NotificationPermissionError';
  }
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function currentPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

// Push-notification enablement. Permission is requested ONLY on the explicit enablePush() action
// (never on mount). On grant, an FCM token is fetched and written to users/{uid}.fcmToken.
export function usePushNotifications() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState(currentPermission());
  const [enabling, setEnabling] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState(null);

  // Feature-detect FCM support on mount — no permission prompt, no token fetch here.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ok = (await isMessagingSupported()) && typeof Notification !== 'undefined';
        if (active) setSupported(ok);
      } catch {
        if (active) setSupported(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const enablePush = useCallback(async () => {
    if (!user) return;
    setEnabling(true);
    setError(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        throw new NotificationPermissionError();
      }

      // Token is function-scoped and only written under the caller's own uid — never logged.
      const token = await getFcmToken(VAPID_KEY);
      if (token) {
        await setFcmToken(user.uid, token);
      }
      setEnabled(true);
    } catch (err) {
      setError(err);
      setEnabled(false);
    } finally {
      setEnabling(false);
    }
  }, [user]);

  return { supported, permission, enabling, enabled, error, enablePush };
}
