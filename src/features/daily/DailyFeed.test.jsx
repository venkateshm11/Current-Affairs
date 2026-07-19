import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Drive the page through mocked hooks so each `source` value can be rendered deterministically.
vi.mock('../../hooks/useDailyAffairs', () => ({
  useDailyAffairs: vi.fn(),
  MissingApiKeyError: class MissingApiKeyError extends Error {},
}));
vi.mock('../../hooks/useStreak', () => ({
  useStreak: () => ({ recordGeneration: vi.fn() }),
}));
vi.mock('../../hooks/useBookmarks', () => ({
  useBookmarks: () => ({ bookmarks: [], add: vi.fn(), remove: vi.fn() }),
}));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ examType: 'all' }),
}));

// Stub the sibling feature components (they pull in their own context/hooks) so this test
// stays focused on DailyFeed's own rendering.
vi.mock('./ExamFilter', () => ({ ExamFilter: () => <div data-testid="exam-filter" /> }));
vi.mock('./WeeklyDigest', () => ({ WeeklyDigest: () => <div data-testid="weekly-digest" /> }));

// Avoid pulling Firebase init in via the real lib modules.
vi.mock('../../lib/gemini', () => ({
  GeminiCallError: class GeminiCallError extends Error {},
  geminiErrorMessage: () => 'AI service unavailable.',
}));
vi.mock('../../lib/firestore', () => ({
  GeminiParseError: class GeminiParseError extends Error {},
}));

import { DailyFeed } from './DailyFeed';
import { useDailyAffairs } from '../../hooks/useDailyAffairs';

const CATEGORIES = [
  { name: 'Economy', icon: '💰', items: [{ title: 'Repo rate held', detail: 'Steady.', importance: 'high', tags: [] }] },
];

const BASE = {
  data: { date: '2025-07-19', examType: 'all', categories: CATEGORIES },
  loading: false,
  generating: false,
  error: null,
  generate: vi.fn(),
  source: 'own',
};

const INDICATOR = /Loaded from community pool/i;

beforeEach(() => {
  vi.clearAllMocks();
});

function renderFeed() {
  return render(
    <MemoryRouter>
      <DailyFeed />
    </MemoryRouter>,
  );
}

describe('DailyFeed community indicator', () => {
  it('renders the community line when source === "community"', () => {
    useDailyAffairs.mockReturnValue({ ...BASE, source: 'community' });
    renderFeed();
    expect(screen.getByText(INDICATOR)).toBeInTheDocument();
  });

  it('does NOT render the community line when source === "own"', () => {
    useDailyAffairs.mockReturnValue({ ...BASE, source: 'own' });
    renderFeed();
    expect(screen.queryByText(INDICATOR)).toBeNull();
  });
});
