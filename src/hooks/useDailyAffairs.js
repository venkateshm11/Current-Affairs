import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDailyAffairs, getUserDoc, saveDailyAffairs } from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import { buildDailyPrompt, callGemini, validateDailyResponse } from '../lib/gemini';

// Raised when the user has not set a Gemini API key yet — the UI redirects to Settings.
export class MissingApiKeyError extends Error {
  constructor(message) {
    super(message || 'No Gemini API key set');
    this.name = 'MissingApiKeyError';
  }
}

// Cache-first daily-affairs generation.
//   - On mount / (uid,date,examType) change: read the Firestore cache only. Never calls
//     Gemini automatically — that would burn the user's quota without intent (golden-rule #4).
//   - generate(): explicit user action. Re-checks the cache, then (on miss) decrypts the
//     key (function-scoped), calls Gemini, validates, saves, and invokes onGenerated().
export function useDailyAffairs(date, examType, { onGenerated } = {}) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true); // initial cache read
  const [generating, setGenerating] = useState(false); // Gemini call in progress
  const [error, setError] = useState(null);

  // Cache-only read — no Gemini call.
  const loadCache = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await getDailyAffairs(user.uid, date, examType);
      setData(cached); // null on cache miss -> empty state
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, date, examType]);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  // Explicit generation. Cache-before-call is enforced here too.
  const generate = useCallback(async () => {
    if (!user) return;
    const uid = user.uid;
    setGenerating(true);
    setError(null);
    try {
      // 1: cache-before-call — if it was generated meanwhile, use it.
      const cached = await getDailyAffairs(uid, date, examType);
      if (cached) {
        setData(cached);
        return;
      }

      // 2: require an API key before touching Gemini.
      const profile = await getUserDoc(uid);
      const encrypted = profile?.geminiApiKey;
      if (!encrypted) {
        throw new MissingApiKeyError();
      }

      // Decrypted key is a function-scoped const — never React state / Context,
      // never passed to children, never logged. It does not outlive callGemini.
      const apiKey = await decryptApiKey(encrypted, uid);
      const prompt = buildDailyPrompt(date, examType);
      const raw = await callGemini(apiKey, prompt);

      const parsed = validateDailyResponse(raw); // throws GeminiParseError -> no save
      await saveDailyAffairs(uid, date, examType, parsed.categories);

      setData({ date, examType, categories: parsed.categories });
      onGenerated?.(); // streak recorded only on a fresh generation
    } catch (err) {
      setError(err);
    } finally {
      setGenerating(false);
    }
    // onGenerated is a stable caller callback — intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, date, examType]);

  return { data, loading, generating, error, generate, refetch: loadCache };
}
