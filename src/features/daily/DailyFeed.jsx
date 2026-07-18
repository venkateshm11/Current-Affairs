import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useDailyAffairs, MissingApiKeyError } from '../../hooks/useDailyAffairs';
import { useStreak } from '../../hooks/useStreak';
import { useBookmarks } from '../../hooks/useBookmarks';
import { GeminiCallError } from '../../lib/gemini';
import { GeminiParseError } from '../../lib/firestore';
import { todayIST } from '../../utils/dates';
import { DailyFeedCard } from './DailyFeedCard';
import { ExamFilter } from './ExamFilter';

const today = () => todayIST();

// Map a thrown error to friendly, generic UI text — raw Gemini output is never shown.
function messageFor(error) {
  if (error instanceof GeminiCallError) {
    return 'AI service unavailable. Check your API key or try again.';
  }
  if (error instanceof GeminiParseError) {
    return 'AI returned unexpected data. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function DailyFeed() {
  const { examType } = useApp();
  const { recordGeneration } = useStreak();
  const date = today();
  const { data, loading, generating, error, generate } = useDailyAffairs(date, examType, {
    onGenerated: recordGeneration,
  });
  const { bookmarks, add, remove } = useBookmarks();

  // Lookup for the current day's bookmarks, keyed by title, so each card knows its state.
  const bookmarkByTitle = new Map(
    bookmarks
      .filter((b) => b.sourceDate === date)
      .map((b) => [b.title, b]),
  );

  function toggleBookmark(item) {
    const existing = bookmarkByTitle.get(item.title);
    if (existing) {
      remove(existing.id);
    } else {
      add({
        title: item.title,
        detail: item.detail,
        tags: item.tags ?? [],
        importance: item.importance,
        sourceDate: date,
        examType,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Daily</h1>
        <span className="font-mono text-xs text-ink-500">{date}</span>
      </div>

      <ExamFilter />

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

    if (error && error instanceof MissingApiKeyError) {
      return (
        <EmptyState
          icon="🔑"
          title="Add your Gemini API key"
          description="Set your API key in Settings to generate today's current affairs."
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

    if (data?.categories?.length) {
      return (
        <div className="space-y-6">
          {data.categories.map((category) => (
            <section key={category.name} className="space-y-2">
              <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
                {category.icon} {category.name}
              </p>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <DailyFeedCard
                    key={`${item.title}-${index}`}
                    item={item}
                    isBookmarked={bookmarkByTitle.has(item.title)}
                    onToggleBookmark={toggleBookmark}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      );
    }

    return (
      <EmptyState
        icon="🗞️"
        title="No affairs generated yet"
        description="Generate today's current affairs for the selected exam filter."
        action={
          <Button onClick={generate} loading={generating}>
            Generate today's affairs
          </Button>
        }
      />
    );
  }
}
