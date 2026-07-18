import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMcqCache, getUserDoc, saveMcqCache } from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import { buildMcqPrompt, callGemini, validateMcqResponse } from '../lib/gemini';
import { MissingApiKeyError } from './useDailyAffairs';

// Cache-first MCQ generation for a day + exam type (ADR-006, golden-rule #4).
//   - On mount / (uid,date,examType) change: read the Firestore MCQ cache only. Never calls
//     Gemini automatically — that would burn the user's quota without intent.
//   - generate(): explicit user action (starting a quiz). Re-checks the cache, then on a miss
//     decrypts the key (function-scoped), calls Gemini, validates, caches, and returns the pool.
// A single pool of up to 50 questions is cached per date+examType; the quiz slices from it.
export function useGeminiMcq(date, examType) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState(null); // null = not loaded yet
  const [loading, setLoading] = useState(true); // initial cache read
  const [generating, setGenerating] = useState(false); // Gemini call in progress
  const [error, setError] = useState(null);

  // Cache-only read — no Gemini call.
  const loadCache = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await getMcqCache(user.uid, date, examType);
      setQuestions(cached?.questions ?? null); // null on cache miss
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, date, examType]);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  // Explicit generation. Cache-before-call is enforced here too. Returns the question pool
  // (array) on success, or null on failure (error state is set). Never throws to the caller.
  const generate = useCallback(async () => {
    if (!user) return null;
    const uid = user.uid;
    setGenerating(true);
    setError(null);
    try {
      // 1: cache-before-call — if it was generated meanwhile, use it. Gemini not called.
      const cached = await getMcqCache(uid, date, examType);
      if (cached?.questions) {
        setQuestions(cached.questions);
        return cached.questions;
      }

      // 2: require an API key before touching Gemini.
      const profile = await getUserDoc(uid);
      const encrypted = profile?.geminiApiKey;
      if (!encrypted) {
        throw new MissingApiKeyError();
      }

      // Decrypted key is a function-scoped const — never React state / Context, never passed
      // to children, never logged. It does not outlive callGemini.
      const apiKey = await decryptApiKey(encrypted, uid);
      const prompt = buildMcqPrompt(date, examType);
      const raw = await callGemini(apiKey, prompt);

      const parsed = validateMcqResponse(raw); // throws GeminiParseError -> no cache write
      await saveMcqCache(uid, date, examType, parsed.questions);

      setQuestions(parsed.questions);
      return parsed.questions;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [user, date, examType]);

  return { questions, loading, generating, error, generate, refetch: loadCache };
}
