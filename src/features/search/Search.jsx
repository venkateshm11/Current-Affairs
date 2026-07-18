import { Button, EmptyState, ErrorMessage, Input, Spinner } from '../../components/ui';
import { useSearch } from '../../hooks/useSearch';
import { Highlight } from './Highlight';

// Client-side keyword search across every archived day. runSearch() reads only the user's own
// dailyAffairs and filters in memory — the keyword is never sent to Gemini or any external service.
// Matches render as JSX text with the keyword highlighted via the safe Highlight component.
const STRIPE = {
  high: 'border-l-2 border-stripe-high bg-tint-high',
  medium: 'border-l-2 border-stripe-medium bg-tint-medium',
  low: 'border-l-2 border-stripe-low bg-tint-low',
};

export function Search() {
  const { term, setTerm, results, searched, loading, error, runSearch } = useSearch();

  function onSubmit(e) {
    e.preventDefault();
    runSearch();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Search</h1>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search your archived affairs…"
          aria-label="Search keyword"
        />
        <Button type="submit" loading={loading}>
          Search
        </Button>
      </form>

      {renderBody()}
    </div>
  );

  function renderBody() {
    if (loading) {
      return (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <ErrorMessage message="Something went wrong. Please try again." onRetry={runSearch} />
      );
    }

    if (!searched) {
      return (
        <EmptyState
          icon="🔍"
          title="Search your archive"
          description="Find any topic across every day you've generated."
        />
      );
    }

    if (results.length === 0) {
      return (
        <EmptyState
          icon="🔍"
          title={`No matches found for "${term}"`}
          description="Try a different keyword."
        />
      );
    }

    return (
      <div className="space-y-3">
        {results.map((result, index) => {
          const stripe = STRIPE[result.item.importance] || STRIPE.low;
          return (
            <div
              key={`${result.sourceDate}-${result.item.title}-${index}`}
              className="space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs text-ink-500">{result.sourceDate}</span>
                <span className="text-2xs text-ink-500 uppercase tracking-widest">
                  {result.examType} · {result.category}
                </span>
              </div>
              <div className={`rounded-md p-3 ${stripe}`}>
                <p className="text-base text-ink-950 font-medium">
                  <Highlight text={result.item.title} term={term} />
                </p>
                <p className="text-sm text-ink-800 mt-1 leading-relaxed">
                  <Highlight text={result.item.detail} term={term} />
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
