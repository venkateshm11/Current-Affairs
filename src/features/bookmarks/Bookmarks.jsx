import { EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useBookmarks } from '../../hooks/useBookmarks';
import { BookmarkCard } from './BookmarkCard';

export function Bookmarks() {
  const { bookmarks, loading, error, remove, refetch } = useBookmarks();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Bookmarks</h1>
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
        <ErrorMessage
          message="Something went wrong. Please try again."
          onRetry={refetch}
        />
      );
    }

    if (!bookmarks.length) {
      return (
        <EmptyState
          icon="🔖"
          title="No bookmarks yet"
          description="Star items while reading the daily feed to save them here."
        />
      );
    }

    return (
      <div className="space-y-2">
        {bookmarks.map((bookmark) => (
          <BookmarkCard key={bookmark.id} bookmark={bookmark} onRemove={remove} />
        ))}
      </div>
    );
  }
}
