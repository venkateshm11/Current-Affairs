import { Button, Card, ProgressBar } from '../../components/ui';

const MODE_LABEL = { casual: 'Casual', timed: 'Timed', exam: 'Exam' };

function formatDuration(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

// Results screen. Every value comes from the local result object computed by the engine —
// never a Firestore read-back. A non-blocking note shows if the save did not persist.
export function QuizResults({ result, saveError, onRetake }) {
  const {
    score,
    totalQ,
    correct,
    wrong,
    skipped,
    categoryBreakdown,
    mode,
    negativeMarkingEnabled,
    timeTaken,
  } = result;

  const categories = Object.entries(categoryBreakdown);

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
              Your score
            </p>
            <p className="text-2xl text-ink-950 font-semibold tracking-tight">
              {score.toFixed(2)}
              <span className="text-sm text-ink-500 font-normal"> / 100</span>
            </p>
          </div>
          <div className="text-right text-xs text-ink-500 space-y-0.5">
            <p>{MODE_LABEL[mode] || mode} mode</p>
            <p>{negativeMarkingEnabled ? 'Negative marking on' : 'No negative marking'}</p>
            <p className="font-mono">{formatDuration(timeTaken)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Correct" value={correct} />
          <Stat label="Wrong" value={wrong} />
          <Stat label="Skipped" value={skipped} />
        </div>
        <p className="text-xs text-ink-500">{totalQ} questions total</p>
      </Card>

      <Card className="space-y-3">
        <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
          Category breakdown
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-ink-500">No category data.</p>
        ) : (
          <div className="space-y-3">
            {categories.map(([name, { correct: c, total }]) => {
              const pct = total === 0 ? 0 : (c / total) * 100;
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-800">{name}</span>
                    <span className="font-mono text-xs text-ink-500">
                      {c}/{total}
                    </span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {saveError && (
        <p className="text-xs text-ink-500">
          Your score could not be saved, but it is shown above.
        </p>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onRetake}>
          Take another quiz
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-ink-300 py-2">
      <p className="text-lg text-ink-950 font-medium">{value}</p>
      <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">{label}</p>
    </div>
  );
}
