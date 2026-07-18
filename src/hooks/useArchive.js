import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listDailyAffairsDates } from '../lib/firestore';

// Lists the dates the user has archived daily-affairs content for, filtered by examType.
// uid from useAuth only (no cross-user access). No Gemini call. Only days that actually exist
// for this user are returned — never a fabricated month grid, never another user's dates.
export function useArchive(examType) {
  const { user } = useAuth();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listDailyAffairsDates(user.uid);
      setAll(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const dates = all
    .filter((entry) => examType === 'all' || entry.examType === examType)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

  return { dates, loading, error, refetch: load };
}
