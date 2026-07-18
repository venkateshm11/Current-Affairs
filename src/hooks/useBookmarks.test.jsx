import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stable auth value so the hook's load effect does not re-run every render.
const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

vi.mock('../lib/firestore', () => ({
  listBookmarks: vi.fn(),
  addBookmark: vi.fn(),
  removeBookmark: vi.fn(),
}));

import { useBookmarks } from './useBookmarks';
import { listBookmarks, addBookmark, removeBookmark } from '../lib/firestore';

const DATA = {
  title: 'RBI holds repo rate',
  detail: 'Steady at 6.5%.',
  tags: ['RBI'],
  importance: 'high',
  sourceDate: '2025-07-18',
  examType: 'all',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBookmarks', () => {
  it('add: writes with the auth uid and prepends to the list', async () => {
    listBookmarks.mockResolvedValue([]);
    addBookmark.mockResolvedValue('new-id');

    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add(DATA);
    });

    expect(addBookmark).toHaveBeenCalledWith('test-uid', expect.objectContaining({
      title: DATA.title,
      detail: DATA.detail,
      sourceDate: DATA.sourceDate,
      examType: DATA.examType,
      importance: DATA.importance,
    }));
    expect(result.current.bookmarks[0]).toMatchObject({ id: 'new-id', title: DATA.title });
  });

  it('remove: deletes by id and drops it from the list', async () => {
    listBookmarks.mockResolvedValue([{ id: 'b1', ...DATA }]);
    removeBookmark.mockResolvedValue();

    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.bookmarks.length).toBe(1));

    await act(async () => {
      await result.current.remove('b1');
    });

    expect(removeBookmark).toHaveBeenCalledWith('test-uid', 'b1');
    expect(result.current.bookmarks).toHaveLength(0);
  });

  it('list failure: sets error, stops loading, keeps the list empty', async () => {
    listBookmarks.mockRejectedValue(new Error('read failed'));

    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.bookmarks).toHaveLength(0);
  });
});
