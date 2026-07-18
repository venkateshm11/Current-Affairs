import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, ProgressBar } from '../../components/ui';

// Format seconds as m:ss for the countdown display.
function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// The active quiz. Renders one question at a time, forward-only (no back-navigation to change
// a prior answer — satisfies the timed/exam "no peeking / no revisit" rule for every mode).
// Casual mode gives instant feedback after each answer; timed/exam reveal nothing until results.
export function QuizRunner({
  questions,
  answers,
  mode,
  timeLimitSec,
  recordAnswer,
  submit,
}) {
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const submittedRef = useRef(false);

  const isCasual = mode === 'casual';
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const selected = answers[index]; // 0-3 or null
  const answered = selected !== null && selected !== undefined;

  // Submit exactly once, even if the timer and a click race.
  const submitOnce = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submit();
  }, [submit]);

  // Countdown timer (timed + exam only) — a single setInterval, session-only, never persisted.
  useEffect(() => {
    if (timeLimitSec == null) return undefined;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLimitSec]);

  // Auto-submit on expiry — submits the current answers as-is, no further changes allowed.
  useEffect(() => {
    if (timeLimitSec != null && timeLeft <= 0) {
      submitOnce();
    }
  }, [timeLeft, timeLimitSec, submitOnce]);

  function choose(optionIndex) {
    // Casual locks the answer once chosen (so instant feedback is stable); timed/exam allow
    // changing the current question's choice until advancing.
    if (isCasual && answered) return;
    recordAnswer(index, optionIndex);
  }

  function advance() {
    if (isLast) {
      submitOnce();
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (!question) return null;

  const progress = (index / questions.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-500">
          Question {index + 1} / {questions.length}
        </span>
        {timeLimitSec != null && (
          <span className="font-mono text-sm text-ink-950 font-medium">
            {formatTime(timeLeft)}
          </span>
        )}
      </div>

      <ProgressBar value={progress} />

      <Card className="space-y-4">
        <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
          {question.category}
        </p>
        <p className="text-md text-ink-950 font-medium">{question.question}</p>

        <div className="space-y-2">
          {question.options.map((option, optIndex) => (
            <OptionButton
              key={optIndex}
              label={option}
              isSelected={selected === optIndex}
              // Correctness is only ever revealed in casual mode after answering.
              reveal={isCasual && answered}
              isCorrect={optIndex === question.correctIndex}
              onClick={() => choose(optIndex)}
              disabled={isCasual && answered}
            />
          ))}
        </div>

        {isCasual && answered && (
          <p className="text-sm text-ink-800 leading-relaxed border-l-2 border-ink-300 pl-3">
            {question.explanation}
          </p>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-500">
          {answered ? 'Answered' : 'Not answered'}
        </span>
        <Button onClick={advance}>{isLast ? 'Submit' : 'Next'}</Button>
      </div>
    </div>
  );
}

// A single answer option. In casual reveal mode the correct option turns green and a chosen
// wrong option turns red; otherwise the selected option gets a quiet near-black border.
function OptionButton({ label, isSelected, reveal, isCorrect, onClick, disabled }) {
  let stateClass = isSelected
    ? 'border-accent bg-ink-100'
    : 'border-ink-300 hover:bg-ink-100';

  if (reveal) {
    if (isCorrect) {
      stateClass = 'border-stripe-low bg-tint-low';
    } else if (isSelected) {
      stateClass = 'border-stripe-high bg-tint-high';
    } else {
      stateClass = 'border-ink-300';
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2.5 rounded border text-sm text-ink-950 transition-colors ${stateClass} ${disabled ? 'cursor-default' : ''}`}
    >
      {label}
    </button>
  );
}
