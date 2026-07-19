import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useMonthlyOverview, EmptyMonthError } from '../../hooks/useMonthlyOverview';
import { MissingApiKeyError } from '../../hooks/useDailyAffairs';
import { GeminiCallError, geminiErrorMessage } from '../../lib/gemini';
import { GeminiParseError } from '../../lib/firestore';
import { ExamFilter } from '../daily/ExamFilter';
import { ExportToolbar } from './ExportToolbar';

// Map a thrown error to friendly, generic UI text — raw Gemini output is never shown.
function messageFor(error) {
  if (error instanceof GeminiCallError) {
    return geminiErrorMessage(error);
  }
  if (error instanceof GeminiParseError) {
    return 'AI returned unexpected data. Please try again.';
  }
  if (error instanceof EmptyMonthError) {
    return 'No content generated this month yet. Generate a day first.';
  }
  return 'Something went wrong. Please try again.';
}

// Monthly overview page. The Gemini call is triggered ONLY by the explicit "Generate monthly
// overview" button — never silently on mount; the hook does a cache-only read on mount and
// decrypts the key only inside generate().
export function MonthlyOverview() {
  const { examType } = useApp();
  const { overview, month, loading, generating, error, generate } =
    useMonthlyOverview(examType);
  const printableRef = useRef(null);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Monthly Overview</h1>
      <ExamFilter />

      {loading && (
        <Card>
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Spinner size="sm" /> Loading monthly overview…
          </div>
        </Card>
      )}

      {!loading && error instanceof MissingApiKeyError && (
        <EmptyState
          icon="🔑"
          title="Add your Gemini API key"
          description="Set your API key in Settings to generate the monthly overview."
          action={
            <Link to="/settings">
              <Button variant="secondary">Go to Settings</Button>
            </Link>
          }
        />
      )}

      {!loading && error && !(error instanceof MissingApiKeyError) && (
        <ErrorMessage message={messageFor(error)} onRetry={generate} />
      )}

      {!loading && !error && !overview && (
        <Card>
          <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
            Monthly overview · {month}
          </p>
          <p className="text-sm text-ink-800 mt-1 leading-relaxed">
            Generate an AI overview of this month&apos;s current affairs — key topics, revision
            points, and a summary for each category.
          </p>
          <Button className="mt-3" onClick={generate} loading={generating}>
            Generate monthly overview
          </Button>
        </Card>
      )}

      {!loading && !error && overview && (
        <>
          <ExportToolbar
            overview={overview}
            month={month}
            examType={examType}
            targetRef={printableRef}
          />

          <div ref={printableRef}>
            <Card>
              <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
                Monthly overview · {month}
              </p>
              <p className="text-xs text-ink-500 mt-1 font-mono">
                {overview.totalDays} days covered
              </p>

              {overview.keyTopics?.length > 0 && (
                <div className="mt-3">
                  <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
                    Key topics
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {overview.keyTopics.map((topic) => (
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

              {overview.revisionPoints?.length > 0 && (
                <div className="mt-3">
                  <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
                    Revision points
                  </p>
                  <ul className="mt-1 space-y-1 list-disc pl-5">
                    {overview.revisionPoints.map((point, index) => (
                      <li key={index} className="text-sm text-ink-800 leading-relaxed">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {overview.categorySummaries &&
                Object.keys(overview.categorySummaries).length > 0 && (
                  <div className="mt-3">
                    <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
                      Category summaries
                    </p>
                    <div className="mt-1 space-y-2">
                      {Object.entries(overview.categorySummaries).map(([name, summary]) => (
                        <div key={name}>
                          <p className="text-base text-ink-950 font-medium">{name}</p>
                          <p className="text-sm text-ink-800 leading-relaxed">{summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
