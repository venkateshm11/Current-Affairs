import { Button } from '../../components/ui';

// A single saved bookmark. Reuses the daily importance-stripe pattern (DESIGN_SYSTEM.md):
// left border stripe + faint tint is the only colour. Every field is rendered as JSX text —
// never dangerouslySetInnerHTML. tags render as individual muted Tag spans, not raw HTML.

const STRIPE = {
  high: 'border-l-2 border-stripe-high bg-tint-high',
  medium: 'border-l-2 border-stripe-medium bg-tint-medium',
  low: 'border-l-2 border-stripe-low bg-tint-low',
};

export function BookmarkCard({ bookmark, onRemove }) {
  const stripe = STRIPE[bookmark.importance] || STRIPE.low;

  return (
    <div className={`rounded-md p-3 ${stripe}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base text-ink-950 font-medium">{bookmark.title}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(bookmark.id)}
          className="shrink-0"
        >
          Remove
        </Button>
      </div>
      <p className="text-sm text-ink-800 mt-1 leading-relaxed">{bookmark.detail}</p>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <span className="font-mono text-xs text-ink-500 mr-1">{bookmark.sourceDate}</span>
        {bookmark.tags?.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 text-2xs font-medium text-ink-500 bg-ink-100 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
