// Safe keyword highlighter. The term is escaped for RegExp metacharacters first (so a user typing
// e.g. ".*" or "(" cannot inject a pattern), then the text is split on a case-insensitive match and
// matched substrings are wrapped in a <mark>. Output is JSX text + <mark> only — there is no
// dangerouslySetInnerHTML / __html anywhere, so the highlight cannot be an XSS vector.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function Highlight({ text, term }) {
  const trimmed = (term || '').trim();
  if (!trimmed) return <>{text}</>;

  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, 'ig');
  const parts = text.split(regex);
  const lower = trimmed.toLowerCase();

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === lower ? (
          <mark key={index} className="bg-stripe-medium/40 text-ink-950 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
