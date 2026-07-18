import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDailyAffairs } from '../lib/firestore';

// Flashcards are built ONLY from already-cached daily content (golden-rule #4): this hook
// reads the Firestore dailyAffairs doc and never calls Gemini. Cache miss -> empty deck.
export function useFlashcards(date, examType) {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await getDailyAffairs(user.uid, date, examType);
      const flattened = (cached?.categories ?? []).flatMap((category) =>
        (category.items ?? []).map((item) => ({
          title: item.title,
          detail: item.detail,
        })),
      );
      setCards(flattened);
    } catch (err) {
      setError(err);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [user, date, examType]);

  useEffect(() => {
    load();
  }, [load]);

  return { cards, loading, error, refetch: load };
}
