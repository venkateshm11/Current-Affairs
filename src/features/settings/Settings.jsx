import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, setGeminiApiKey } from '../../lib/firestore';
import { encryptApiKey } from '../../lib/crypto';
import { validateApiKey, geminiErrorMessage } from '../../lib/gemini';
import { Button, Card, ErrorMessage, Input, Spinner } from '../../components/ui';
import { usePushNotifications } from '../../hooks/usePushNotifications';

// Push-notification opt-in. Permission is requested only when the user clicks Enable.
function PushNotificationsCard() {
  const { supported, permission, enabling, enabled, error, enablePush } =
    usePushNotifications();

  return (
    <Card>
      <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
        Push notifications
      </p>

      {!supported ? (
        <p className="text-sm text-ink-500 mt-2">
          Notifications are not supported in this browser.
        </p>
      ) : permission === 'denied' ? (
        <p className="text-sm text-ink-500 mt-2">
          Notifications are blocked. Enable them in your browser settings to get a daily reminder.
        </p>
      ) : enabled || permission === 'granted' ? (
        <p className="text-sm text-ink-500 mt-2">
          Notifications are on. You&apos;ll get a daily reminder if today&apos;s affairs
          aren&apos;t generated yet.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-ink-500">
            Get a daily reminder when today&apos;s current affairs aren&apos;t generated yet.
          </p>
          {error && (
            <ErrorMessage message="Could not enable notifications. Please try again." />
          )}
          <Button onClick={enablePush} loading={enabling}>
            Enable notifications
          </Button>
        </div>
      )}
    </Card>
  );
}

// API key setup. The plaintext key exists only in local component state during entry,
// is encrypted before the Firestore write, and is cleared from state immediately after.
// The stored key is never rendered or logged.
export function Settings() {
  const { user } = useAuth();
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Determine whether a key is already set (we only track presence, never the value).
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const profile = await getUserDoc(user.uid);
        if (active) setHasKey(Boolean(profile?.geminiApiKey));
      } catch {
        if (active) setError('Could not load settings. Please try again.');
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  async function handleSave() {
    setError('');
    setSaved(false);
    const plainKey = keyInput.trim();
    if (!plainKey) {
      setError('Please enter your Gemini API key.');
      return;
    }

    setSaving(true);
    try {
      // Verify the key actually works with Gemini before storing it. A key that "saves"
      // but can't call Gemini is the main source of the "AI service unavailable" confusion,
      // so we reject a definitively bad key here instead of failing later at generation.
      // A network-inconclusive result still saves (offline tolerance).
      const check = await validateApiKey(plainKey);
      if (!check.ok && !check.network) {
        setError(geminiErrorMessage({ status: check.status }));
        return;
      }

      const encrypted = await encryptApiKey(plainKey, user.uid);
      await setGeminiApiKey(user.uid, encrypted);
      setKeyInput(''); // discard plaintext from state immediately after the write
      setHasKey(true);
      setSaved(true);
    } catch {
      setError('Something went wrong saving your key. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Settings</h1>

      <Card>
        <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
          Gemini API key
        </p>

        {checking ? (
          <div className="mt-3">
            <Spinner />
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-500 mt-2">
              {hasKey
                ? 'A key is set. Enter a new key below to replace it.'
                : 'Enter your Gemini API key to generate daily current affairs. It is encrypted before it is stored.'}
            </p>
            <p className="text-2xs text-ink-500 mt-1">
              Use a free key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-ink-950"
              >
                Google AI Studio
              </a>
              . Only Google Gemini keys work here — keys from other providers won&apos;t.
            </p>

            <div className="mt-3 space-y-3">
              <Input
                id="gemini-api-key"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste your Gemini API key"
              />

              {error && <ErrorMessage message={error} />}
              {saved && (
                <p className="text-sm text-stripe-low">API key saved.</p>
              )}

              <Button onClick={handleSave} loading={saving}>
                {hasKey ? 'Replace key' : 'Save key'}
              </Button>
            </div>
          </>
        )}
      </Card>

      <PushNotificationsCard />
    </div>
  );
}
