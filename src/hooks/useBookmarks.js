import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addBookmark, listBookmarks, removeBookmark } from '../lib/firestore';

// Bookmarks reading + mutation. uid comes from the authenticated user only — never a prop
// or URL param, so no cross-uid access is possible. No Gemini call anywhere in this hook.
export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listBookmarks(user.uid);
      setBookmarks(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Copy the item fields by value at save time — never a live Firestore reference.
  const add = useCallback(
    async (data) => {
      if (!user) return;
      const bookmark = {
        title: data.title,
        detail: data.detail,
        sourceDate: data.sourceDate,
        examType: data.examType,
        tags: data.tags ?? [],
        importance: data.importance,
      };
      try {
        const id = await addBookmark(user.uid, bookmark);
        // Optimistic prepend (newest first). savedAt resolves on the next refetch.
        setBookmarks((prev) => [{ id, ...bookmark }, ...prev]);
      } catch (err) {
        setError(err);
      }
    },
    [user],
  );

  const remove = useCallback(
    async (id) => {
      if (!user) return;
      try {
        await removeBookmark(user.uid, id);
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        setError(err);
      }
    },
    [user],
  );

  return { bookmarks, loading, error, add, remove, refetch: load };
}
