import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useFlashcards } from '../../hooks/useFlashcards';
import { todayIST } from '../../utils/dates';
import { ExamFilter } from '../daily/ExamFilter';
import { FlashCard } from './FlashCard';

export function Flashcards() {
  const { examType } = useApp();
  const date = todayIST();
  const { cards, loading, error, refetch } = useFlashcards(date, examType);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [visited, setVisited] = useState(() => new Set());

  // Reset the deck position whenever the underlying cards change (e.g. exam type switch).
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setVisited(new Set(cards.length ? [0] : []));
  }, [cards]);

  const flip = useCallback(() => {
    setFlipped((f) => !f);
    setVisited((prev) => new Set(prev).add(index));
  }, [index]);

  const next = useCallback(() => {
    setIndex((i) => {
      const ni = Math.min(i + 1, cards.length - 1);
      setVisited((prev) => new Set(prev).add(ni));
      return ni;
    });
    setFlipped(false);
  }, [cards.length]);

  const prev = useCallback(() => {
    setIndex((i) => {
      const pi = Math.max(i - 1, 0);
      setVisited((prevSet) => new Set(prevSet).add(pi));
      return pi;
    });
    setFlipped(false);
  }, []);

  // Keyboard navigation: Space/Enter flip (preventDefault to stop page scroll / activation),
  // arrows move. No form is present, so no submit risk. Only active when cards are loaded.
  useEffect(() => {
    if (!cards.length) return undefined;
    function onKeyDown(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cards.length, flip, next, prev]);

  const allVisited = cards.length > 0 && visited.size >= cards.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Flashcards</h1>
        {cards.length > 0 && (
          <span className="text-xs text-ink-500">
            {index + 1} / {cards.length}
          </span>
        )}
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

    if (error) {
      return (
        <ErrorMessage
          message="Something went wrong. Please try again."
          onRetry={refetch}
        />
      );
    }

    if (!cards.length) {
      return (
        <EmptyState
          icon="🃏"
          title="No daily content for this day"
          description="Generate today's affairs first, then revise them as flashcards."
          action={
            <Link to="/">
              <Button variant="secondary">Go to Daily</Button>
            </Link>
          }
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="lg"
            onClick={prev}
            disabled={index === 0}
            className="shrink-0"
          >
            ‹
          </Button>
          <div className="flex-1">
            <FlashCard card={cards[index]} flipped={flipped} onFlip={flip} />
          </div>
          <Button
            variant="ghost"
            size="lg"
            onClick={next}
            disabled={index === cards.length - 1}
            className="shrink-0"
          >
            ›
          </Button>
        </div>

        <p className="text-center text-xs text-ink-500">
          Tap the card or press Space to flip · ← → to move
        </p>

        {allVisited && (
          <EmptyState
            icon="✅"
            title="Deck complete"
            description="You have been through every card for today."
          />
        )}
      </div>
    );
  }
}
