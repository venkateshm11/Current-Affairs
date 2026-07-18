import { describe, it, expect } from 'vitest';
import { computeScore } from './scoring';

// A small fixture pool. correctIndex is the "right" answer for each.
const Q = [
  { correctIndex: 0, category: 'Economy' }, // 0
  { correctIndex: 1, category: 'Economy' }, // 1
  { correctIndex: 2, category: 'Polity' }, // 2
  { correctIndex: 3, category: 'Polity' }, // 3
];

describe('computeScore — casual (no negative marking)', () => {
  it('wrong answers do not reduce the score', () => {
    // 2 correct, 2 wrong. sum = 2. (2/4)*100 = 50.
    const answers = [0, 1, 0, 0]; // first two correct, last two wrong
    const r = computeScore({ questions: Q, answers, negativeMarkingEnabled: false });
    expect(r.correct).toBe(2);
    expect(r.wrong).toBe(2);
    expect(r.skipped).toBe(0);
    expect(r.totalQ).toBe(4);
    expect(r.score).toBe(50);
  });
});

describe('computeScore — timed (negative marking on)', () => {
  it('each wrong answer deducts exactly 0.25', () => {
    // 2 correct (+2), 2 wrong (-0.5). sum = 1.5. (1.5/4)*100 = 37.5.
    const answers = [0, 1, 0, 0];
    const r = computeScore({ questions: Q, answers, negativeMarkingEnabled: true });
    expect(r.correct).toBe(2);
    expect(r.wrong).toBe(2);
    expect(r.score).toBe(37.5);
  });

  it('a single wrong answer with negative marking gives the expected 2dp score', () => {
    // 3 correct (+3), 1 wrong (-0.25). sum = 2.75. (2.75/4)*100 = 68.75.
    const answers = [0, 1, 2, 0];
    const r = computeScore({ questions: Q, answers, negativeMarkingEnabled: true });
    expect(r.correct).toBe(3);
    expect(r.wrong).toBe(1);
    expect(r.score).toBe(68.75);
  });
});

describe('computeScore — exam (skipped questions)', () => {
  it('skipped contributes 0, is counted separately, and totalQ includes it', () => {
    // 2 correct (+2), 1 wrong (-0.25 with neg), 1 skipped (0). sum = 1.75. (1.75/4)*100 = 43.75.
    const answers = [0, 1, 0, null];
    const r = computeScore({ questions: Q, answers, negativeMarkingEnabled: true });
    expect(r.correct).toBe(2);
    expect(r.wrong).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.totalQ).toBe(4);
    expect(r.score).toBe(43.75);
  });

  it('skipped is never counted as wrong even without negative marking', () => {
    const answers = [0, 1, 2, undefined]; // 3 correct, 1 skipped
    const r = computeScore({ questions: Q, answers, negativeMarkingEnabled: false });
    expect(r.correct).toBe(3);
    expect(r.wrong).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.score).toBe(75);
  });
});

describe('computeScore — rounding and breakdown', () => {
  it('rounds the final score to 2 decimal places', () => {
    // 1 correct of 3 -> (1/3)*100 = 33.333... -> 33.33
    const three = [
      { correctIndex: 0, category: 'A' },
      { correctIndex: 0, category: 'A' },
      { correctIndex: 0, category: 'A' },
    ];
    const r = computeScore({
      questions: three,
      answers: [0, 1, 1],
      negativeMarkingEnabled: false,
    });
    expect(r.score).toBe(33.33);
  });

  it('tracks correct/total per category', () => {
    const answers = [0, 0, 2, 0]; // Economy: 1/2 correct, Polity: 1/2 correct
    const r = computeScore({ questions: Q, answers, negativeMarkingEnabled: false });
    expect(r.categoryBreakdown).toEqual({
      Economy: { correct: 1, total: 2 },
      Polity: { correct: 1, total: 2 },
    });
  });

  it('returns 0 for an empty quiz without dividing by zero', () => {
    const r = computeScore({ questions: [], answers: [], negativeMarkingEnabled: true });
    expect(r.score).toBe(0);
    expect(r.totalQ).toBe(0);
  });
});
