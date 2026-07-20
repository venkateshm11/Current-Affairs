import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/firestore', () => ({
  listSharedDaily: vi.fn(),
}));

import { useCommunityPool } from './useCommunityPool';
import { listSharedDaily } from '../lib/firestore';

const POOL = [
  { id: '2025-07-18_banking', date: '2025-07-18', examType: 'banking' },
  { id: '2025-07-20_all', date: '2025-07-20', examType: 'all' },
  { id: '2025-07-19_upsc', date: '2025-07-19', examType: 'upsc' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCommunityPool', () => {
  it('all: returns every pooled day, sorted newest-first', async () => {
    listSharedDaily.mockResolvedValue(POOL);
    const { result } = renderHook(() => useCommunityPool('all'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dates.map((d) => d.date)).toEqual([
      '2025-07-20',
      '2025-07-19',
      '2025-07-18',
    ]);
    expect(result.current.error).toBeNull();
  });

  it('banking: returns only banking entries', async () => {
    listSharedDaily.mockResolvedValue(POOL);
    const { result } = renderHook(() => useCommunityPool('banking'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dates).toHaveLength(1);
    expect(result.current.dates[0]).toMatchObject({ date: '2025-07-18', examType: 'banking' });
  });

  it('surfaces a read error', async () => {
    listSharedDaily.mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useCommunityPool('all'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.dates).toEqual([]);
  });
});
