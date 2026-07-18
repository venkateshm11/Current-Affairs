// Canonical quiz scoring (frontend.md / schema.md / phase-4 security).
// Pure function of local quiz state ONLY — never reads the Gemini response object or any
// Firestore read-back. This is the single source of truth for the score formula.
//
//   correct                         : +1
//   wrong  (negative marking on)    : -0.25   (exactly — no other value)
//   wrong  (negative marking off)   :  0
//   skipped / unanswered            :  0       (never counted as wrong)
//   final score = (sum / totalQ) * 100, rounded to 2 decimal places
//
// answers is parallel to questions: each entry is a chosen option index (0-3) or
// null/undefined for a skipped question. totalQ includes skipped questions.

const NEGATIVE_MARK = 0.25;

export function computeScore({ questions, answers, negativeMarkingEnabled }) {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let sum = 0;
  const categoryBreakdown = {};

  questions.forEach((q, i) => {
    const category = q.category;
    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { correct: 0, total: 0 };
    }
    categoryBreakdown[category].total += 1;

    const answer = answers[i];
    if (answer === null || answer === undefined) {
      skipped += 1;
      return;
    }
    if (answer === q.correctIndex) {
      correct += 1;
      sum += 1;
      categoryBreakdown[category].correct += 1;
    } else {
      wrong += 1;
      if (negativeMarkingEnabled) {
        sum -= NEGATIVE_MARK;
      }
    }
  });

  const totalQ = questions.length;
  const raw = totalQ === 0 ? 0 : (sum / totalQ) * 100;
  const score = Math.round(raw * 100) / 100; // 2 decimal places

  return { score, totalQ, correct, wrong, skipped, categoryBreakdown };
}
