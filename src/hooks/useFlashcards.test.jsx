import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

// Only getDailyAffairs is mocked — the hook must not touch Gemini at all.
vi.mock('../lib/firestore', () => ({
  getDailyAffairs: vi.fn(),
}));

import { useFlashcards } from './useFlashcards';
import { getDailyAffairs } from '../lib/firestore';

const DATE = '2025-07-18';
const EXAM = 'all';
const CACHED = {
  date: DATE,
  examType: EXAM,
  categories: [
    { name: 'Economy', icon: '💰', items: [
      { title: 'Q1', detail: 'A1', importance: 'high', tags: [] },
      { title: 'Q2', detail: 'A2', importance: 'low', tags: [] },
    ] },
    { name: 'Polity', icon: '🏛️', items: [
      { title: 'Q3', detail: 'A3', importance: 'medium', tags: [] },
    ] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFlashcards', () => {
  it('cache hit: flattens cached category items into cards (no Gemini)', async () => {
    getDailyAffairs.mockResolvedValue(CACHED);

    const { result } = renderHook(() => useFlashcards(DATE, EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getDailyAffairs).toHaveBeenCalledWith('test-uid', DATE, EXAM);
    expect(result.current.cards).toEqual([
      { title: 'Q1', detail: 'A1' },
      { title: 'Q2', detail: 'A2' },
      { title: 'Q3', detail: 'A3' },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('cache miss: returns an empty deck', async () => {
    getDailyAffairs.mockResolvedValue(null);

    const { result } = renderHook(() => useFlashcards(DATE, EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.cards).toHaveLength(0);
  });

  it('read failure: sets error and empty cards', async () => {
    getDailyAffairs.mockRejectedValue(new Error('read failed'));

    const { result } = renderHook(() => useFlashcards(DATE, EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.cards).toHaveLength(0);
  });
});
