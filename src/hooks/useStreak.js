import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getUserDoc, updateStreak } from '../lib/firestore';
import { computeStreakUpdate } from '../utils/streak';
import { todayIST, yesterdayIST } from '../utils/dates';

// Streak reading + update. streak lives in AppContext (for the header display);
// recordGeneration is called once after a successful fresh daily generation.
export function useStreak() {
  const { user } = useAuth();
  const { streak, setStreak } = useApp();

  const recordGeneration = useCallback(async () => {
    if (!user) return;
    // Read the authoritative streak from Firestore, then apply canonical IST logic.
    const profile = await getUserDoc(user.uid);
    const prev = profile?.streak || { current: 0, longest: 0, lastDate: null };
    const next = computeStreakUpdate(prev, todayIST(), yesterdayIST());
    await updateStreak(user.uid, next); // single atomic write of all three fields
    setStreak(next); // optimistic header update
  }, [user, setStreak]);

  return { streak, recordGeneration };
}
