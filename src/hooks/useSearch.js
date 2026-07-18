import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchDailyAffairs } from '../lib/firestore';

// Client-side cross-day search. The keyword never leaves the browser except to the in-memory
// JS filter inside searchDailyAffairs (which reads only users/{uid}/dailyAffairs). No Gemini
// call, no external request — the keyword is never sent anywhere.
export function useSearch() {
  const { user } = useAuth();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSearch = useCallback(async () => {
    if (!user) return;
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const matches = await searchDailyAffairs(user.uid, trimmed);
      setResults(matches);
      setSearched(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, term]);

  return { term, setTerm, results, searched, loading, error, runSearch };
}
