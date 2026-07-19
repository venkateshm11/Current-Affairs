import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDailyAffairs,
  getSharedDaily,
  getUserDoc,
  saveDailyAffairs,
  saveSharedDaily,
} from '../lib/firestore';
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
//   - generate(): explicit user action. Checks own cache -> shared community pool -> Gemini,
//     in that order, so the user's own quota is only spent when nobody has generated today.
//
// `source` ('own' | 'community' | 'gemini' | null) records where the currently-shown data
// came from. It lives in React local state only — it is never written to Firestore.
export function useDailyAffairs(date, examType, { onGenerated } = {}) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [source, setSource] = useState(null); // 'own' | 'community' | 'gemini' | null
  const [loading, setLoading] = useState(true); // initial cache read
  const [generating, setGenerating] = useState(false); // Gemini call in progress
  const [error, setError] = useState(null);

  // Cache-only read — no Gemini call, no shared-pool read.
  const loadCache = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await getDailyAffairs(user.uid, date, examType);
      setData(cached); // null on cache miss -> empty state
      setSource(cached ? 'own' : null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, date, examType]);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  // Explicit generation. Cache-before-call is enforced here too, now with the shared pool
  // as a second cache tier ahead of Gemini.
  const generate = useCallback(async () => {
    if (!user) return;
    const uid = user.uid;
    setGenerating(true);
    setError(null);
    try {
      // Step 1: own cache-before-call — if it was generated meanwhile, use it.
      // On a hit we do NOT touch the shared pool and do NOT call Gemini.
      const cached = await getDailyAffairs(uid, date, examType);
      if (cached) {
        setData(cached);
        setSource('own');
        return;
      }

      // Step 2: shared community pool. A public read (no uid). If someone else has already
      // generated today's content, copy it into this user's own cache and skip Gemini
      // entirely — the user's own API quota is preserved. Corrupt shared data is treated
      // as a miss (validated below) so a bad pool doc can never crash the caller.
      const shared = await getSharedDaily(date, examType);
      if (shared) {
        let sharedCategories = null;
        try {
          sharedCategories = validateDailyResponse(shared).categories;
        } catch {
          sharedCategories = null; // corrupt pool doc -> fall through to Gemini
        }
        if (sharedCategories) {
          await saveDailyAffairs(uid, date, examType, sharedCategories);
          setData({ date, examType, categories: sharedCategories });
          setSource('community');
          onGenerated?.(); // the user now has today's content -> counts for the streak
          return;
        }
      }

      // Step 3: both caches missed (or the pool doc was corrupt) — call Gemini.
      // Require an API key before touching Gemini.
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

      // Seed the shared pool only if we were the first to generate today (shared was null).
      // The create-only Firestore rule blocks overwrites regardless.
      if (!shared) {
        await saveSharedDaily(date, examType, parsed.categories);
      }

      setData({ date, examType, categories: parsed.categories });
      setSource('gemini');
      onGenerated?.(); // streak recorded on a fresh generation
    } catch (err) {
      setError(err);
    } finally {
      setGenerating(false);
    }
    // onGenerated is a stable caller callback — intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, date, examType]);

  return { data, loading, generating, error, generate, refetch: loadCache, source };
}
