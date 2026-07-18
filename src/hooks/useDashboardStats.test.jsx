import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

const APP_VALUE = { streak: { current: 4, longest: 9, lastDate: '2025-07-18' } };
vi.mock('../context/AppContext', () => ({
  useApp: () => APP_VALUE,
}));

vi.mock('../lib/firestore', () => ({
  listTestResults: vi.fn(),
}));

import { useDashboardStats } from './useDashboardStats';
import { listTestResults } from '../lib/firestore';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDashboardStats', () => {
  it('aggregates category accuracy weakest-first and computes summary stats', async () => {
    listTestResults.mockResolvedValue([
      {
        id: 'r1',
        date: '2025-07-10',
        score: 80,
        categoryBreakdown: {
          Economy: { correct: 8, total: 10 },
          Polity: { correct: 2, total: 10 },
        },
      },
      {
        id: 'r2',
        date: '2025-07-11',
        score: 60,
        categoryBreakdown: {
          Economy: { correct: 4, total: 10 },
          Polity: { correct: 6, total: 10 },
        },
      },
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Trend is chronological, one point per result.
    expect(result.current.trend).toEqual([
      { date: '2025-07-10', score: 80 },
      { date: '2025-07-11', score: 60 },
    ]);

    // Economy 12/20 = 60%, Polity 8/20 = 40% → weakest (Polity) first.
    expect(result.current.weakCategories).toEqual([
      { category: 'Polity', accuracy: 40 },
      { category: 'Economy', accuracy: 60 },
    ]);

    expect(result.current.stats).toEqual({
      totalTests: 2,
      avgScore: 70,
      bestScore: 80,
      currentStreak: 4,
      longestStreak: 9,
    });
  });

  it('empty: no test results → totalTests 0, streak still surfaced', async () => {
    listTestResults.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats.totalTests).toBe(0);
    expect(result.current.stats.currentStreak).toBe(4);
    expect(result.current.trend).toEqual([]);
    expect(result.current.weakCategories).toEqual([]);
  });

  it('read failure sets the error state', async () => {
    listTestResults.mockRejectedValue(new Error('read failed'));

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});
