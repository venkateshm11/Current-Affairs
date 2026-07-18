import { useCallback, useEffect, useRef, useState } from 'react';

// PWA install prompt. Captures the browser's 'beforeinstallprompt' event so the app can offer an
// explicit "Install" action. No auth data, no key, nothing persisted — dismissal is local state.
export function usePwaInstall() {
  const deferredEvent = useRef(null);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onBeforeInstall(event) {
      event.preventDefault();
      deferredEvent.current = event;
      setCanInstall(true);
    }
    function onInstalled() {
      deferredEvent.current = null;
      setCanInstall(false);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const event = deferredEvent.current;
    if (!event) return;
    event.prompt();
    await event.userChoice;
    deferredEvent.current = null;
    setCanInstall(false);
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { canInstall, promptInstall, dismiss, dismissed };
}
