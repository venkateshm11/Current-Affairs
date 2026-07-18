// A single flip card. Front = question (title), back = answer (detail). Both faces are
// always present in the DOM (backface-visibility: hidden in index.css) so there is no flash
// of unstyled content on flip. The flip is pure CSS transform — no JS animation library, no
// eval/new Function/setTimeout(string). Both faces render as JSX text — never innerHTML.
// Rendered as a <button type="button"> so click and keyboard activation are native and it
// can never submit a form.

export function FlashCard({ card, flipped, onFlip }) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? 'Show question' : 'Show answer'}
      className="card-scene w-full aspect-[4/3] md:aspect-[3/2] block focus:outline-none"
    >
      <div className={`card-inner relative w-full h-full ${flipped ? 'flipped' : ''}`}>
        <div className="card-face flex items-center justify-center bg-white border border-ink-300 rounded-md shadow-card">
          <p className="text-lg text-ink-950 font-medium text-center px-6">{card.title}</p>
        </div>
        <div className="card-face card-back flex items-center justify-center bg-white border border-ink-300 rounded-md shadow-card">
          <p className="text-sm text-ink-800 leading-relaxed text-center px-6">{card.detail}</p>
        </div>
      </div>
    </button>
  );
}
