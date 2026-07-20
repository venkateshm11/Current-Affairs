import { useCallback, useEffect, useState } from 'react';
import { listSharedDaily } from '../lib/firestore';

// Lists the days available in the shared community pool, filtered by examType. Reads the
// shared (non-user) collection only — no uid, no Gemini, no write. examType 'all' shows every
// exam type (mirrors useArchive). Only days that actually exist in the pool are returned.
export function useCommunityPool(examType) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listSharedDaily();
      setAll(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dates = all
    .filter((entry) => examType === 'all' || entry.examType === examType)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

  return { dates, loading, error, refetch: load };
}
