import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/firestore', () => ({
  getSharedDaily: vi.fn(),
}));

import { CommunityDay } from './CommunityDay';
import { getSharedDaily } from '../../lib/firestore';

const DOC = {
  date: '2025-07-20',
  examType: 'all',
  categories: [
    {
      name: 'Economy',
      icon: '💰',
      items: [
        { title: 'RBI holds repo rate', detail: 'Steady at 6.5%.', importance: 'high', tags: ['RBI'] },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CommunityDay reader', () => {
  it('renders pooled categories and items from the shared doc (no uid passed)', async () => {
    getSharedDaily.mockResolvedValue(DOC);
    render(<CommunityDay date="2025-07-20" examType="all" onBack={() => {}} />);

    await waitFor(() => expect(screen.getByText('RBI holds repo rate')).toBeInTheDocument());
    expect(getSharedDaily).toHaveBeenCalledWith('2025-07-20', 'all');
    // getSharedDaily takes exactly two args — no uid is ever passed.
    expect(getSharedDaily.mock.calls[0]).toHaveLength(2);
  });

  it('renders the empty state when the pool has no doc for the day', async () => {
    getSharedDaily.mockResolvedValue(null);
    render(<CommunityDay date="2025-07-20" examType="all" onBack={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText('Nothing in the pool for this day')).toBeInTheDocument(),
    );
  });
});
