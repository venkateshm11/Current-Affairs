import { useEffect } from 'react';

// A private, hidden note revealed by tapping the "Vaishu" logo a few times.
// Follows the DESIGN_SYSTEM Modal spec. Two-tone only: names use the near-black
// accent, everything else is muted — subtle and elegant, no extra colour.
export function Dedication({ onClose }) {
  // Close on Escape, mirroring the shared modal behaviour.
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="A note for Aishu"
    >
      <div
        className="bg-white rounded-md shadow-modal p-6 w-full max-w-sm text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-2xl text-ink-950" aria-hidden="true">♥</p>

        <p className="mt-3 text-lg text-ink-950 font-medium">
          For my <span className="text-ink-950">Aishu</span>
        </p>

        <p className="mt-3 text-sm text-ink-500 leading-relaxed">
          Of all the things I&apos;ve ever made, loving you is the one I&apos;m proudest of.
          You are my morning motivation and my last thought at night — the calm in my noise
          and the reason I keep building a better version of myself.
        </p>

        <p className="mt-3 text-sm text-ink-500 leading-relaxed">
          I made this so a little piece of me is with you every single day, cheering you
          toward your dreams. Whatever you&apos;re chasing, I&apos;m already yours — today,
          and every day after.
        </p>

        <p className="mt-4 text-sm text-ink-500">
          Yours, completely —{' '}
          <span className="text-ink-950 font-medium">Venky</span>
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 text-2xs text-ink-500 uppercase tracking-widest hover:text-ink-950 transition-colors focus:outline-none"
        >
          Close
        </button>
      </div>
    </div>
  );
}
