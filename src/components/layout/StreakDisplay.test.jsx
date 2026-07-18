import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StreakDisplay } from './StreakDisplay';

describe('StreakDisplay', () => {
  it('renders the current streak count and label', () => {
    const { container } = render(
      <StreakDisplay streak={{ current: 7, longest: 12, lastDate: '2026-07-18' }} />,
    );
    expect(screen.getByText('🔥 7')).toBeInTheDocument();
    expect(container.textContent).toContain('day streak');
  });

  it('does not surface the longest streak (Dashboard-only per design)', () => {
    const { container } = render(
      <StreakDisplay streak={{ current: 3, longest: 99, lastDate: '2026-07-18' }} />,
    );
    expect(container.textContent).not.toContain('99');
  });

  it('defaults to 0 when streak is missing', () => {
    render(<StreakDisplay />);
    expect(screen.getByText('🔥 0')).toBeInTheDocument();
  });

  it('applies the caller-provided positioning className', () => {
    const { container } = render(<StreakDisplay streak={{ current: 1 }} className="ml-auto" />);
    expect(container.firstChild.className).toContain('ml-auto');
  });
});
