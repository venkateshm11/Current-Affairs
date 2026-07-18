// A single daily-affairs item. The importance stripe (left border + faint tint) is the
// signature element (DESIGN_SYSTEM.md) — it is the only colour on the card.
// Every field is rendered as JSX text — never dangerouslySetInnerHTML.

const STRIPE = {
  high: 'border-l-2 border-stripe-high bg-tint-high',
  medium: 'border-l-2 border-stripe-medium bg-tint-medium',
  low: 'border-l-2 border-stripe-low bg-tint-low',
};

export function DailyFeedCard({ item }) {
  const stripe = STRIPE[item.importance] || STRIPE.low;

  return (
    <div className={`rounded-md p-3 ${stripe}`}>
      <p className="text-base text-ink-950 font-medium">{item.title}</p>
      <p className="text-sm text-ink-800 mt-1 leading-relaxed">{item.detail}</p>
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 text-2xs font-medium text-ink-500 bg-ink-100 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
