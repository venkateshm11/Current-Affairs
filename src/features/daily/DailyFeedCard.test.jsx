import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DailyFeedCard } from './DailyFeedCard';

const item = {
  title: 'RBI keeps repo rate unchanged at 6.5%',
  detail: 'The Reserve Bank of India held the repo rate steady this quarter.',
  importance: 'high',
  tags: ['RBI', 'monetary policy'],
};

describe('DailyFeedCard', () => {
  it('renders title, detail, and each tag as text', () => {
    render(<DailyFeedCard item={item} />);
    expect(screen.getByText(item.title)).toBeInTheDocument();
    expect(screen.getByText(item.detail)).toBeInTheDocument();
    expect(screen.getByText('RBI')).toBeInTheDocument();
    expect(screen.getByText('monetary policy')).toBeInTheDocument();
  });

  it('applies the high-importance stripe classes', () => {
    const { container } = render(<DailyFeedCard item={item} />);
    const card = container.firstChild;
    expect(card.className).toContain('border-stripe-high');
    expect(card.className).toContain('bg-tint-high');
  });

  it('maps medium and low importance to their stripe classes', () => {
    const medium = render(<DailyFeedCard item={{ ...item, importance: 'medium' }} />);
    expect(medium.container.firstChild.className).toContain('border-stripe-medium');

    const low = render(<DailyFeedCard item={{ ...item, importance: 'low' }} />);
    expect(low.container.firstChild.className).toContain('border-stripe-low');
  });
});
