import { useEffect, useState } from 'react';
import { Button, EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { getSharedDaily } from '../../lib/firestore';
import { DailyFeedCard } from '../daily/DailyFeedCard';

// Read-only reader for one day in the shared community pool. Loads sharedDaily/{date}_{examType}
// via the existing getSharedDaily helper (no uid — a public shared read, no Gemini call) and
// renders the day using DailyFeedCard in READ-ONLY mode: no onToggleBookmark is passed, so the
// card hides its bookmark button.
export function CommunityDay({ date, examType, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getSharedDaily(date, examType)
      .then((doc) => {
        if (active) setData(doc);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, examType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <span className="font-mono text-xs text-ink-500">{date}</span>
      </div>
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
      return <ErrorMessage message="Something went wrong. Please try again." />;
    }

    if (!data?.categories?.length) {
      return (
        <EmptyState
          icon="🌐"
          title="Nothing in the pool for this day"
          description="This day has no shared content for the selected exam filter."
        />
      );
    }

    return (
      <div className="space-y-6">
        {data.categories.map((category) => (
          <section key={category.name} className="space-y-2">
            <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
              {category.icon} {category.name}
            </p>
            <div className="space-y-2">
              {category.items.map((item, index) => (
                <DailyFeedCard key={`${item.title}-${index}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }
}
