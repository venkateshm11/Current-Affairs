import { EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { StatCards } from './StatCards';
import { ScoreTrendChart } from './ScoreTrendChart';
import { WeakCategoriesChart } from './WeakCategoriesChart';

// All figures come from useDashboardStats, which reads users/{uid}/testResults and computes
// everything client-side — no Gemini call on this page.
export function Dashboard() {
  const { stats, trend, weakCategories, loading, error, refetch } = useDashboardStats();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Dashboard</h1>
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
        <ErrorMessage message="Something went wrong. Please try again." onRetry={refetch} />
      );
    }

    if (stats.totalTests === 0) {
      return (
        <EmptyState
          icon="📊"
          title="No stats yet"
          description="Take your first test to see stats here"
        />
      );
    }

    return (
      <div className="space-y-6">
        <StatCards stats={stats} />

        <section className="space-y-2">
          <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
            Score trend
          </p>
          <ScoreTrendChart data={trend} />
        </section>

        {weakCategories.length > 0 && (
          <section className="space-y-2">
            <p className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
              Category accuracy
            </p>
            <WeakCategoriesChart data={weakCategories} />
          </section>
        )}
      </div>
    );
  }
}
