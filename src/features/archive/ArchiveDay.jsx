import { useEffect, useState } from 'react';
import { Button, EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getDailyAffairs } from '../../lib/firestore';
import { DailyFeedCard } from '../daily/DailyFeedCard';

// Read-only day reader. Loads users/{uid}/dailyAffairs/{date}_{examType} via the existing helper
// (uid from useAuth — never a prop) and renders the day using DailyFeedCard in READ-ONLY mode:
// no onToggleBookmark is passed, so the card hides its bookmark button. No Gemini call.
export function ArchiveDay({ date, examType, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    getDailyAffairs(user.uid, date, examType)
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
  }, [user, date, examType]);

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
          icon="🗄️"
          title="Nothing archived for this day"
          description="This day has no stored content for the selected exam filter."
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
