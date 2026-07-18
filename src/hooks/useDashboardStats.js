import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { listTestResults } from '../lib/firestore';

// Reads users/{uid}/testResults (uid from useAuth only) and derives every dashboard figure
// client-side. No Gemini call anywhere. streak comes from AppContext (already loaded from
// Firestore) and is surfaced as current/longest for the stat tiles.
function round2(n) {
  return Math.round(n * 100) / 100;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const { streak } = useApp();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listTestResults(user.uid);
      setResults(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Score trend — chronological (results already ordered ascending by takenAt).
  const trend = results.map((r) => ({ date: r.date, score: r.score }));

  // Weak categories — aggregate categoryBreakdown across every result, weakest first.
  const agg = {};
  for (const r of results) {
    const breakdown = r.categoryBreakdown || {};
    for (const [name, cb] of Object.entries(breakdown)) {
      if (!agg[name]) agg[name] = { correct: 0, total: 0 };
      agg[name].correct += cb.correct || 0;
      agg[name].total += cb.total || 0;
    }
  }
  const weakCategories = Object.entries(agg)
    .map(([category, cb]) => ({
      category,
      accuracy: cb.total ? round2((cb.correct / cb.total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const stats = {
    totalTests: results.length,
    avgScore: results.length
      ? round2(results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length)
      : 0,
    bestScore: results.length
      ? round2(Math.max(...results.map((r) => r.score || 0)))
      : 0,
    currentStreak: streak.current,
    longestStreak: streak.longest,
  };

  return { stats, trend, weakCategories, loading, error, refetch: load };
}
