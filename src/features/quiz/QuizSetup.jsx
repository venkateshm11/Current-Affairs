import { useState } from 'react';
import { Button, Card, Tabs } from '../../components/ui';
import { QUIZ_MODES, TIMED_COUNTS } from '../../hooks/useQuizEngine';

const MODE_TABS = [
  { id: 'casual', label: 'Casual' },
  { id: 'timed', label: 'Timed' },
  { id: 'exam', label: 'Exam' },
];

const MODE_BLURB = {
  casual: '10 questions · no timer · instant feedback · no negative marking.',
  timed: 'Pick your length · countdown timer · results at the end.',
  exam: '50 questions · 60 minutes · no feedback until the end · −0.25 per wrong answer.',
};

// Quiz configuration screen. All inputs are validated on the client before the quiz starts:
// mode comes from a fixed tab set, count from a fixed option set, negative marking is a boolean.
export function QuizSetup({ onStart, generating }) {
  const [mode, setMode] = useState('casual');
  const [count, setCount] = useState(TIMED_COUNTS[0]);
  const [negativeMarking, setNegativeMarking] = useState(false);

  const preset = QUIZ_MODES[mode];
  const effectiveCount = mode === 'timed' ? count : preset.count;

  function start() {
    onStart({ mode, count: effectiveCount, negativeMarking });
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">Mode</p>
        <Tabs tabs={MODE_TABS} activeTab={mode} onTabChange={setMode} />
        <p className="text-xs text-ink-500 pt-1">{MODE_BLURB[mode]}</p>
      </div>

      {mode === 'timed' && (
        <>
          <div className="space-y-1.5">
            <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
              Questions
            </p>
            <div className="flex gap-2">
              {TIMED_COUNTS.map((n) => (
                <Button
                  key={n}
                  variant={count === n ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 accent-accent"
            />
            Negative marking (−0.25 per wrong answer)
          </label>
        </>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-ink-500">
          {effectiveCount} questions
          {preset.timed ? ' · timed' : ''}
        </span>
        <Button onClick={start} loading={generating}>
          Start quiz
        </Button>
      </div>
    </Card>
  );
}
