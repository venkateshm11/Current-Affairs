// Canonical streak calculation (schema.md). Pure function — no Firestore, no Date.
// Callers pass today/yesterday as IST "YYYY-MM-DD" strings (see utils/dates.js).
//
// Cases:
//   lastDate === today      -> already counted today, current unchanged
//   lastDate === yesterday  -> consecutive day, current + 1
//   otherwise (older/null)  -> streak broken, reset to 1
//
// longest never regresses: it is the max of the previous longest and the new current.

export function computeStreakUpdate(prevStreak, today, yesterday) {
  const prev = prevStreak || { current: 0, longest: 0, lastDate: null };

  let current;
  if (prev.lastDate === today) {
    current = prev.current;
  } else if (prev.lastDate === yesterday) {
    current = prev.current + 1;
  } else {
    current = 1;
  }

  const longest = Math.max(prev.longest || 0, current);

  return { current, longest, lastDate: today };
}
