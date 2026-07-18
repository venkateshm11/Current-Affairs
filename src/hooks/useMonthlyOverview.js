import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDailyAffairs,
  getMonthlyOverview,
  getUserDoc,
  saveMonthlyOverview,
} from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import {
  buildMonthlyPrompt,
  callGemini,
  validateMonthlyResponse,
} from '../lib/gemini';
import { isoMonthIST, monthDatesIST } from '../utils/dates';
import { MissingApiKeyError } from './useDailyAffairs';

// Raised when the current month has no archived daily-affairs content to summarise — we refuse
// to call Gemini with nothing to work from.
export class EmptyMonthError extends Error {
  constructor(message) {
    super(message || 'No content this month to summarise');
    this.name = 'EmptyMonthError';
  }
}

// Cache-first monthly overview for the current IST month + exam type (golden-rule #4).
//   - On mount / (uid, examType) change: read the Firestore cache ONLY. Never calls Gemini and
//     never decrypts the key on mount.
//   - generate(): explicit user action. Re-checks the cache, gathers the month's content, then
//     (on a miss) decrypts the key inside this function only, calls Gemini, validates, caches.
export function useMonthlyOverview(examType) {
  const { user } = useAuth();
  const month = isoMonthIST();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Cache-only read — no Gemini call, no key decryption.
  const loadCache = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await getMonthlyOverview(user.uid, month, examType);
      setOverview(cached); // null on a miss
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, month, examType]);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  // Explicit generation. Cache-before-call is enforced here too. Returns the overview on success
  // or null on failure (error state is set). Never throws to the caller.
  const generate = useCallback(async () => {
    if (!user) return null;
    const uid = user.uid;
    setGenerating(true);
    setError(null);
    try {
      // 1: cache-before-call — if it was generated meanwhile, use it. Gemini not called.
      const cached = await getMonthlyOverview(uid, month, examType);
      if (cached) {
        setOverview(cached);
        return cached;
      }

      // 2: gather the month's content — reuse the existing daily cache reads.
      const days = await Promise.all(
        monthDatesIST(month).map((d) => getDailyAffairs(uid, d, examType)),
      );
      const monthContent = days.filter(Boolean);
      if (monthContent.length === 0) {
        throw new EmptyMonthError();
      }

      // 3: require an API key before touching Gemini.
      const profile = await getUserDoc(uid);
      const encrypted = profile?.geminiApiKey;
      if (!encrypted) {
        throw new MissingApiKeyError();
      }

      // Decrypted key is a function-scoped const — never React state / Context, never passed to
      // children, never logged. It does not outlive callGemini.
      const apiKey = await decryptApiKey(encrypted, uid);
      const prompt = buildMonthlyPrompt(month, examType, monthContent);
      const raw = await callGemini(apiKey, prompt);

      const parsed = validateMonthlyResponse(raw); // throws GeminiParseError -> no save
      await saveMonthlyOverview(uid, month, examType, parsed);

      setOverview(parsed);
      return parsed;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [user, month, examType]);

  return { overview, month, loading, generating, error, generate, refetch: loadCache };
}
