import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/useArchive', () => ({
  useArchive: vi.fn(),
}));

// Archive and its ExamFilter both read AppContext — provide a stable mock.
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ examType: 'all', setExamType: vi.fn() }),
}));

import { Archive } from './Archive';
import { useArchive } from '../../hooks/useArchive';

const BASE = { dates: [], loading: false, error: null, refetch: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Archive page', () => {
  it('loading: renders a spinner', () => {
    useArchive.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<Archive />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('empty: renders the empty-state copy when no days exist', () => {
    useArchive.mockReturnValue({ ...BASE, dates: [] });
    render(<Archive />);
    expect(screen.getByText('No content archived yet')).toBeInTheDocument();
  });

  it('data: renders exactly the days that have data (no fabricated days)', () => {
    useArchive.mockReturnValue({
      ...BASE,
      dates: [
        { id: '2025-07-11_all', date: '2025-07-11', examType: 'all' },
        { id: '2025-07-10_all', date: '2025-07-10', examType: 'all' },
      ],
    });
    render(<Archive />);
    expect(screen.getByText('2025-07-11')).toBeInTheDocument();
    expect(screen.getByText('2025-07-10')).toBeInTheDocument();
    // Only the two provided days render as day buttons — nothing else.
    const dayButtons = screen
      .getAllByRole('button')
      .filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.textContent.slice(0, 10)));
    expect(dayButtons).toHaveLength(2);
  });
});
