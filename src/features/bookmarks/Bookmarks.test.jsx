import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Drive the page via a mocked hook so we can render each state deterministically.
vi.mock('../../hooks/useBookmarks', () => ({
  useBookmarks: vi.fn(),
}));

import { Bookmarks } from './Bookmarks';
import { useBookmarks } from '../../hooks/useBookmarks';

const BASE = {
  bookmarks: [],
  loading: false,
  error: null,
  add: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Bookmarks page', () => {
  it('loading: renders a spinner', () => {
    useBookmarks.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<Bookmarks />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('error: renders the error message', () => {
    useBookmarks.mockReturnValue({ ...BASE, error: new Error('boom') });
    render(<Bookmarks />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('empty: renders the empty state when there are no bookmarks', () => {
    useBookmarks.mockReturnValue({ ...BASE, bookmarks: [] });
    render(<Bookmarks />);
    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
  });

  it('data: renders a card per bookmark', () => {
    useBookmarks.mockReturnValue({
      ...BASE,
      bookmarks: [
        {
          id: 'b1',
          title: 'RBI holds repo rate',
          detail: 'Steady at 6.5%.',
          importance: 'high',
          tags: ['RBI'],
          sourceDate: '2025-07-18',
        },
      ],
    });
    render(<Bookmarks />);
    expect(screen.getByText('RBI holds repo rate')).toBeInTheDocument();
  });
});
