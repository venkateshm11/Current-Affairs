import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/useSearch', () => ({
  useSearch: vi.fn(),
}));

import { Search } from './Search';
import { useSearch } from '../../hooks/useSearch';

const BASE = {
  term: '',
  setTerm: vi.fn(),
  results: [],
  searched: false,
  loading: false,
  error: null,
  runSearch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Search page', () => {
  it('initial: shows the search hint before any search', () => {
    useSearch.mockReturnValue({ ...BASE });
    render(<Search />);
    expect(screen.getByText('Search your archive')).toBeInTheDocument();
  });

  it('match: renders the matching item with the keyword highlighted', () => {
    useSearch.mockReturnValue({
      ...BASE,
      term: 'repo',
      searched: true,
      results: [
        {
          sourceDate: '2025-07-10',
          examType: 'all',
          category: 'Economy',
          item: {
            title: 'RBI repo rate held',
            detail: 'Steady at 6.5%.',
            importance: 'high',
            tags: [],
          },
        },
      ],
    });
    const { container } = render(<Search />);
    expect(screen.getByText('2025-07-10')).toBeInTheDocument();
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark.textContent.toLowerCase()).toBe('repo');
  });

  it('no match: renders the escaped no-results copy', () => {
    useSearch.mockReturnValue({
      ...BASE,
      term: 'xyz',
      searched: true,
      results: [],
    });
    render(<Search />);
    expect(screen.getByText('No matches found for "xyz"')).toBeInTheDocument();
  });
});
