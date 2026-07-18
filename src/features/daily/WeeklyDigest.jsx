import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useWeeklyDigest, EmptyWeekError } from '../../hooks/useWeeklyDigest';
import { MissingApiKeyError } from '../../hooks/useDailyAffairs';
import { GeminiCallError } from '../../lib/gemini';
import { GeminiParseError } from '../../lib/firestore';
import { todayIST } from '../../utils/dates';

// Map a thrown error to friendly, generic UI text — raw Gemini output is never shown.
function messageFor(error) {
  if (error instanceof GeminiCallError) {
    return 'AI service unavailable. Check your API key or try again.';
  }
  if (error instanceof GeminiParseError) {
    return 'AI returned unexpected data. Please try again.';
  }
  if (error instanceof EmptyWeekError) {
    return 'No content generated this week yet. Generate a day first.';
  }
  return 'Something went wrong. Please try again.';
}

// Is today Sunday in IST? (getUTCDay on the IST calendar date, Sun = 0.)
function isSundayIST() {
  const [y, m, d] = todayIST().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

// Weekly AI summary panel, rendered inside the Daily feed. The Gemini call is triggered ONLY by
// the explicit "Generate weekly digest" button (highlighted on Sundays) — never silently on mount;
// the hook does a cache-only read on mount and decrypts the key only inside generate().
export function WeeklyDigest({ examType }) {
  const { digest, week, loading, generating, error, generate } = useWeeklyDigest(examType);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <Spinner size="sm" /> Loading weekly digest…
        </div>
      </Card>
    );
  }

  if (error instanceof MissingApiKeyError) {
    return (
      <EmptyState
        icon="🔑"
        title="Add your Gemini API key"
        description="Set your API key in Settings to generate the weekly digest."
        action={
          <Link to="/settings">
            <Button variant="secondary">Go to Settings</Button>
          </Link>
        }
      />
    );
  }

  if (error) {
    return <ErrorMessage message={messageFor(error)} onRetry={generate} />;
  }

  if (!digest) {
    const sunday = isSundayIST();
    return (
      <Card className={sunday ? 'border-accent' : ''}>
        <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
          Weekly digest · {week}
        </p>
        <p className="text-sm text-ink-800 mt-1 leading-relaxed">
          {sunday
            ? "It's Sunday — generate an AI summary of this week's current affairs."
            : "Generate an AI summary of this week's current affairs so far."}
        </p>
        <Button className="mt-3" onClick={generate} loading={generating}>
          Generate weekly digest
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
        Weekly digest · {week}
      </p>
      <p className="text-sm text-ink-800 mt-2 leading-relaxed">{digest.weekSummary}</p>

      {digest.keyTopics?.length > 0 && (
        <div className="mt-3">
          <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
            Key topics
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {digest.keyTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center px-2 py-0.5 text-2xs font-medium text-ink-500 bg-ink-100 rounded"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {digest.revisionPoints?.length > 0 && (
        <div className="mt-3">
          <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
            Revision points
          </p>
          <ul className="mt-1 space-y-1 list-disc pl-5">
            {digest.revisionPoints.map((point, index) => (
              <li key={index} className="text-sm text-ink-800 leading-relaxed">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
