// Streak display (DESIGN_SYSTEM.md): one quiet line — never a banner or card.
// Shows the current consecutive-day streak as fire + number only (🔥 N). streak.longest
// is intentionally NOT shown here — it is reserved for the Dashboard (Phase 5).
// className lets callers position it (e.g. ml-auto in the header, block in the sidebar).
export function StreakDisplay({ streak, className = '' }) {
  const current = streak?.current ?? 0;
  return (
    <span className={`text-sm ${className}`}>
      <span className="text-ink-950 font-medium">🔥 {current}</span>
    </span>
  );
}
