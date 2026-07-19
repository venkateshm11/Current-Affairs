import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { MissingApiKeyError } from '../../hooks/useDailyAffairs';
import { GeminiCallError, geminiErrorMessage } from '../../lib/gemini';
import { GeminiParseError } from '../../lib/firestore';
import { todayIST } from '../../utils/dates';
import { ExamFilter } from '../daily/ExamFilter';
import { QuizSetup } from './QuizSetup';
import { QuizRunner } from './QuizRunner';
import { QuizResults } from './QuizResults';

// Map a thrown error to friendly, generic UI text — raw Gemini output is never shown.
function messageFor(error) {
  if (error instanceof GeminiCallError) {
    return geminiErrorMessage(error);
  }
  if (error instanceof GeminiParseError) {
    return 'Could not generate questions. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function Quiz() {
  const { examType } = useApp();
  const date = todayIST();
  const engine = useQuizEngine(date, examType);
  const {
    phase,
    questions,
    answers,
    mode,
    timeLimitSec,
    result,
    saveError,
    generating,
    error,
    startQuiz,
    recordAnswer,
    submit,
    reset,
  } = engine;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Quiz</h1>
        <span className="font-mono text-xs text-ink-500">{date}</span>
      </div>

      {/* Exam filter drives which day+examType MCQ pool is used; hidden mid-quiz. */}
      {phase === 'setup' && <ExamFilter />}

      {renderBody()}
    </div>
  );

  function renderBody() {
    if (phase === 'loading') {
      return (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      );
    }

    if (phase === 'in-progress') {
      return (
        <QuizRunner
          questions={questions}
          answers={answers}
          mode={mode}
          timeLimitSec={timeLimitSec}
          recordAnswer={recordAnswer}
          submit={submit}
        />
      );
    }

    if (phase === 'results') {
      return <QuizResults result={result} saveError={saveError} onRetake={reset} />;
    }

    // phase === 'setup' — show any generation error above the setup card.
    return (
      <div className="space-y-4">
        {error instanceof MissingApiKeyError ? (
          <EmptyState
            icon="🔑"
            title="Add your Gemini API key"
            description="Set your API key in Settings to generate quiz questions."
            action={
              <Link to="/settings">
                <Button variant="secondary">Go to Settings</Button>
              </Link>
            }
          />
        ) : (
          <>
            {error && <ErrorMessage message={messageFor(error)} />}
            <QuizSetup onStart={startQuiz} generating={generating} />
          </>
        )}
      </div>
    );
  }
}
