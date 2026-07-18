import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, setGeminiApiKey } from '../../lib/firestore';
import { encryptApiKey } from '../../lib/crypto';
import { Button, Card, ErrorMessage, Input, Spinner } from '../../components/ui';

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
    </div>
  );
}
