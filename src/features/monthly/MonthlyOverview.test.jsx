import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ examType: 'all', setExamType: vi.fn() }),
}));

vi.mock('../../hooks/useMonthlyOverview', () => ({
  useMonthlyOverview: vi.fn(),
  EmptyMonthError: class EmptyMonthError extends Error {},
}));

vi.mock('../../hooks/useDailyAffairs', () => ({
  MissingApiKeyError: class MissingApiKeyError extends Error {},
}));

vi.mock('../../lib/gemini', () => ({
  GeminiCallError: class GeminiCallError extends Error {},
  geminiErrorMessage: () => 'AI service unavailable. Check your API key or try again.',
}));

vi.mock('../../lib/firestore', () => ({
  GeminiParseError: class GeminiParseError extends Error {},
}));

// Child components with their own dependencies are stubbed — this test covers MonthlyOverview.
vi.mock('../daily/ExamFilter', () => ({ ExamFilter: () => null }));
vi.mock('./ExportToolbar', () => ({ ExportToolbar: () => null }));

import { MonthlyOverview } from './MonthlyOverview';
import { useMonthlyOverview } from '../../hooks/useMonthlyOverview';
import { MissingApiKeyError } from '../../hooks/useDailyAffairs';

const BASE = {
  overview: null,
  month: '2025-07',
  loading: false,
  generating: false,
  error: null,
  generate: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <MonthlyOverview />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MonthlyOverview page', () => {
  it('loading: renders a spinner', () => {
    useMonthlyOverview.mockReturnValue({ ...BASE, loading: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('empty: renders the generate prompt when there is no cached overview', () => {
    useMonthlyOverview.mockReturnValue({ ...BASE, overview: null });
    renderPage();
    expect(screen.getByText('Generate monthly overview')).toBeInTheDocument();
  });

  it('data: renders key topics, revision points and a category summary', () => {
    useMonthlyOverview.mockReturnValue({
      ...BASE,
      overview: {
        keyTopics: ['Monetary policy'],
        revisionPoints: ['RBI held the repo rate at 6.5%.'],
        categorySummaries: { 'Economy & Finance': 'A steady month.' },
        totalDays: 30,
      },
    });
    renderPage();
    expect(screen.getByText('Key topics')).toBeInTheDocument();
    expect(screen.getByText('Monetary policy')).toBeInTheDocument();
    expect(screen.getByText('Revision points')).toBeInTheDocument();
    expect(screen.getByText('RBI held the repo rate at 6.5%.')).toBeInTheDocument();
    expect(screen.getByText('Economy & Finance')).toBeInTheDocument();
    expect(screen.getByText('A steady month.')).toBeInTheDocument();
  });

  it('missing API key: renders the Settings empty-state link', () => {
    useMonthlyOverview.mockReturnValue({
      ...BASE,
      error: new MissingApiKeyError(),
    });
    renderPage();
    expect(screen.getByText('Add your Gemini API key')).toBeInTheDocument();
    expect(screen.getByText('Go to Settings')).toBeInTheDocument();
  });
});
