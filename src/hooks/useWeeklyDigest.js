import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDailyAffairs,
  getUserDoc,
  getWeeklyDigest,
  saveWeeklyDigest,
} from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import {
  buildWeeklyDigestPrompt,
  callGemini,
  validateWeeklyDigestResponse,
} from '../lib/gemini';
import { isoWeekIST, weekDatesIST } from '../utils/dates';
import { MissingApiKeyError } from './useDailyAffairs';

// Raised when the current ISO week has no archived daily-affairs content to summarise —
// we refuse to call Gemini with nothing to work from.
export class EmptyWeekError extends Error {
  constructor(message) {
    super(message || 'No content this week to summarise');
    this.name = 'EmptyWeekError';
  }
}

// Cache-first weekly digest for the current ISO week + exam type (golden-rule #4).
//   - On mount / (uid, examType) change: read the Firestore cache ONLY. Never calls Gemini and
//     never decrypts the key on mount.
//   - generate(): explicit user action. Re-checks the cache, gathers the week's content, then
//     (on a miss) decrypts the key inside this function only, calls Gemini, validates, caches.
export function useWeeklyDigest(examType) {
  const { user } = useAuth();
  const week = isoWeekIST();
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Cache-only read — no Gemini call, no key decryption.
  const loadCache = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await getWeeklyDigest(user.uid, week, examType);
      setDigest(cached); // null on a miss
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, week, examType]);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  // Explicit generation. Cache-before-call is enforced here too. Returns the digest on success
  // or null on failure (error state is set). Never throws to the caller.
  const generate = useCallback(async () => {
    if (!user) return null;
    const uid = user.uid;
    setGenerating(true);
    setError(null);
    try {
      // 1: cache-before-call — if it was generated meanwhile, use it. Gemini not called.
      const cached = await getWeeklyDigest(uid, week, examType);
      if (cached) {
        setDigest(cached);
        return cached;
      }

      // 2: gather the week's content (7 IST dates) — reuse the existing daily cache reads.
      const days = await Promise.all(
        weekDatesIST().map((d) => getDailyAffairs(uid, d, examType)),
      );
      const weekContent = days.filter(Boolean);
      if (weekContent.length === 0) {
        throw new EmptyWeekError();
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
      const prompt = buildWeeklyDigestPrompt(week, examType, weekContent);
      const raw = await callGemini(apiKey, prompt);

      const parsed = validateWeeklyDigestResponse(raw); // throws GeminiParseError -> no save
      await saveWeeklyDigest(uid, week, examType, parsed);

      setDigest(parsed);
      return parsed;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [user, week, examType]);

  return { digest, week, loading, generating, error, generate, refetch: loadCache };
}
