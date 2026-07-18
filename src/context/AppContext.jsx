import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getUserDoc, updateDefaultExamType } from '../lib/firestore';

export const AppContext = createContext(null);

const DEFAULT_EXAM_TYPE = 'all';
const DEFAULT_STREAK = { current: 0, longest: 0, lastDate: null };

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [examType, setExamTypeState] = useState(DEFAULT_EXAM_TYPE);
  const [streak, setStreak] = useState(DEFAULT_STREAK);

  // Seed examType + streak from the user's profile document on sign-in.
  useEffect(() => {
    if (!user) {
      setExamTypeState(DEFAULT_EXAM_TYPE);
      setStreak(DEFAULT_STREAK);
      return;
    }
    let active = true;
    (async () => {
      try {
        const profile = await getUserDoc(user.uid);
        if (!active || !profile) return;
        if (profile.defaultExamType) setExamTypeState(profile.defaultExamType);
        if (profile.streak) setStreak(profile.streak);
      } catch {
        // Non-fatal: keep defaults. Never log — the error may reference uid/user data.
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Persist the chosen exam type (optimistic local update, then Firestore write).
  function setExamType(nextExamType) {
    setExamTypeState(nextExamType);
    if (user) {
      updateDefaultExamType(user.uid, nextExamType).catch(() => {
        // Non-fatal: the local selection still applies for this session.
      });
    }
  }

  const value = useMemo(
    () => ({ examType, setExamType, streak, setStreak }),
    // setExamType/setStreak are stable enough for this provider's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [examType, streak, user],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
