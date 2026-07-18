import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/useDashboardStats', () => ({
  useDashboardStats: vi.fn(),
}));

import { Dashboard } from './Dashboard';
import { useDashboardStats } from '../../hooks/useDashboardStats';

const EMPTY_STATS = {
  totalTests: 0,
  avgScore: 0,
  bestScore: 0,
  currentStreak: 0,
  longestStreak: 0,
};

const BASE = {
  stats: EMPTY_STATS,
  trend: [],
  weakCategories: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard page', () => {
  it('loading: renders a spinner', () => {
    useDashboardStats.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<Dashboard />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('empty: renders the empty-state copy when no tests taken', () => {
    useDashboardStats.mockReturnValue({ ...BASE, stats: { ...EMPTY_STATS } });
    render(<Dashboard />);
    expect(
      screen.getByText('Take your first test to see stats here'),
    ).toBeInTheDocument();
  });

  it('data: renders stat tiles and chart sections once results exist', () => {
    useDashboardStats.mockReturnValue({
      ...BASE,
      stats: {
        totalTests: 3,
        avgScore: 72.5,
        bestScore: 90,
        currentStreak: 5,
        longestStreak: 11,
      },
      trend: [{ date: '2025-07-10', score: 90 }],
      weakCategories: [{ category: 'Polity', accuracy: 40 }],
    });
    render(<Dashboard />);
    expect(screen.getByText('Tests taken')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Score trend')).toBeInTheDocument();
    expect(screen.getByText('Category accuracy')).toBeInTheDocument();
  });
});
