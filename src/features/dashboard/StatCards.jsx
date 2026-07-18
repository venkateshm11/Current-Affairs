import { Card } from '../../components/ui';

// Quiet stat tiles — value carried by type weight, no colour beyond the ink tokens.
// Longest streak is surfaced here only (frontend.md STREAK DISPLAY).
const TILES = [
  { key: 'totalTests', label: 'Tests taken' },
  { key: 'avgScore', label: 'Average score' },
  { key: 'bestScore', label: 'Best score' },
  { key: 'currentStreak', label: 'Current streak' },
  { key: 'longestStreak', label: 'Longest streak' },
];

export function StatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {TILES.map((tile) => (
        <Card key={tile.key}>
          <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
            {tile.label}
          </p>
          <p className="text-xl text-ink-950 mt-1">{stats[tile.key]}</p>
        </Card>
      ))}
    </div>
  );
}
