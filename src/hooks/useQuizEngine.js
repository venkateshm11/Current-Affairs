import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGeminiMcq } from './useGeminiMcq';
import { computeScore } from '../utils/scoring';
import { saveTestResult } from '../lib/firestore';

// Per-mode configuration (frontend.md quiz table + phase-4 data contracts).
//   casual: 10Q, no timer, instant feedback, no negative marking (fixed)
//   timed:  10/20/30Q (user), countdown = count*60s, feedback at end, negative marking toggle
//   exam:   50Q, 3600s total, no feedback during, negative marking fixed on
export const QUIZ_MODES = {
  casual: { count: 10, negativeMarking: false, timed: false, feedback: 'instant' },
  timed: { count: 10, negativeMarking: false, timed: true, feedback: 'end' },
  exam: { count: 50, negativeMarking: true, timed: true, feedback: 'end' },
};

export const TIMED_COUNTS = [10, 20, 30];
const EXAM_TOTAL_SECONDS = 3600;
const SECONDS_PER_QUESTION = 60;

// Quiz state machine + orchestration. Owns the phase, the sliced question set, the answers,
// and the final result. QuizRunner renders only in 'in-progress'; QuizResults only in 'results'.
export function useQuizEngine(date, examType) {
  const { user } = useAuth();
  const mcq = useGeminiMcq(date, examType);

  const [phase, setPhase] = useState('setup'); // setup | loading | in-progress | results
  const [questions, setQuestions] = useState([]); // the sliced set for this run
  const [answers, setAnswers] = useState([]); // parallel to questions; index 0-3 or null
  const [mode, setMode] = useState('casual');
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [timeLimitSec, setTimeLimitSec] = useState(null); // null for casual (no timer)
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const startedAtRef = useRef(0); // wall-clock ms at quiz start, for timeTaken

  // Begin a quiz. Generates (cache-first) the pool, slices `count`, and enters 'in-progress'.
  // On generation failure the phase returns to 'setup' and mcq.error drives the error UI.
  const startQuiz = useCallback(
    async ({ mode: chosenMode, count, negativeMarking }) => {
      const preset = QUIZ_MODES[chosenMode];
      if (!preset) return;

      // Client-side validation of setup inputs before touching Gemini.
      const resolvedCount =
        chosenMode === 'timed'
          ? TIMED_COUNTS.includes(count)
            ? count
            : TIMED_COUNTS[0]
          : preset.count;
      const resolvedNegative =
        chosenMode === 'timed' ? Boolean(negativeMarking) : preset.negativeMarking;

      setPhase('loading');
      const pool = await mcq.generate(); // cache-first; null on failure
      if (!pool || pool.length === 0) {
        setPhase('setup');
        return;
      }

      const sliced = pool.slice(0, resolvedCount);
      setMode(chosenMode);
      setQuestions(sliced);
      setAnswers(new Array(sliced.length).fill(null));
      setNegativeMarkingEnabled(resolvedNegative);
      setTimeLimitSec(
        !preset.timed
          ? null
          : chosenMode === 'exam'
            ? EXAM_TOTAL_SECONDS
            : sliced.length * SECONDS_PER_QUESTION,
      );
      setResult(null);
      setSaveError(null);
      startedAtRef.current = Date.now();
      setPhase('in-progress');
    },
    [mcq],
  );

  // Record (or change, in casual mode) the answer for a question index.
  const recordAnswer = useCallback((index, optionIndex) => {
    setAnswers((prev) => {
      const next = prev.slice();
      next[index] = optionIndex;
      return next;
    });
  }, []);

  // Finish the quiz: compute the score locally, then persist. Results render regardless of
  // whether the Firestore write succeeds — a save failure is surfaced but non-blocking.
  const submit = useCallback(async () => {
    const timeTaken = Math.round((Date.now() - startedAtRef.current) / 1000);
    const scored = computeScore({ questions, answers, negativeMarkingEnabled });
    const localResult = {
      ...scored,
      mode,
      negativeMarkingEnabled,
      timeTaken,
      date,
      examType,
    };
    setResult(localResult);
    setPhase('results');

    if (user) {
      try {
        await saveTestResult(user.uid, localResult);
      } catch (err) {
        setSaveError(err);
      }
    }
  }, [questions, answers, negativeMarkingEnabled, mode, date, examType, user]);

  // Return to setup for another attempt (same cached pool — no new Gemini call).
  const reset = useCallback(() => {
    setPhase('setup');
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setSaveError(null);
  }, []);

  return useMemo(
    () => ({
      phase,
      questions,
      answers,
      mode,
      negativeMarkingEnabled,
      timeLimitSec,
      result,
      saveError,
      // Generation status flows from the MCQ hook.
      generating: mcq.generating,
      error: mcq.error,
      startQuiz,
      recordAnswer,
      submit,
      reset,
    }),
    [
      phase,
      questions,
      answers,
      mode,
      negativeMarkingEnabled,
      timeLimitSec,
      result,
      saveError,
      mcq.generating,
      mcq.error,
      startQuiz,
      recordAnswer,
      submit,
      reset,
    ],
  );
}
