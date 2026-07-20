import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/useCommunityPool', () => ({
  useCommunityPool: vi.fn(),
}));

// CommunityPool and its ExamFilter both read AppContext — provide a stable mock.
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ examType: 'all', setExamType: vi.fn() }),
}));

// Stub the day reader so this test stays focused on CommunityPool's own rendering.
vi.mock('./CommunityDay', () => ({
  CommunityDay: ({ date }) => <div data-testid="community-day">reader:{date}</div>,
}));

import { CommunityPool } from './CommunityPool';
import { useCommunityPool } from '../../hooks/useCommunityPool';

const BASE = { dates: [], loading: false, error: null, refetch: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CommunityPool page', () => {
  it('loading: renders a spinner', () => {
    useCommunityPool.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<CommunityPool />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('empty: renders the empty-state copy when the pool has no days', () => {
    useCommunityPool.mockReturnValue({ ...BASE, dates: [] });
    render(<CommunityPool />);
    expect(screen.getByText('No community content yet')).toBeInTheDocument();
  });

  it('data: renders one day button per pooled day and opens the reader on click', () => {
    useCommunityPool.mockReturnValue({
      ...BASE,
      dates: [
        { id: '2025-07-20_all', date: '2025-07-20', examType: 'all' },
        { id: '2025-07-19_banking', date: '2025-07-19', examType: 'banking' },
      ],
    });
    render(<CommunityPool />);

    expect(screen.getByText('2025-07-20')).toBeInTheDocument();
    expect(screen.getByText('2025-07-19')).toBeInTheDocument();

    // Selecting a day swaps the grid for the CommunityDay reader.
    fireEvent.click(screen.getByText('2025-07-20'));
    expect(screen.getByTestId('community-day')).toHaveTextContent('reader:2025-07-20');
  });
});
