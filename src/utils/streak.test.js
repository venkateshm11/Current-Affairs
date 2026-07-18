import { describe, it, expect } from 'vitest';
import { computeStreakUpdate } from './streak';

const TODAY = '2025-07-18';
const YESTERDAY = '2025-07-17';

describe('computeStreakUpdate', () => {
  it('increments when the last generation was yesterday', () => {
    const next = computeStreakUpdate(
      { current: 4, longest: 6, lastDate: YESTERDAY },
      TODAY,
      YESTERDAY,
    );
    expect(next).toEqual({ current: 5, longest: 6, lastDate: TODAY });
  });

  it('is a no-op when already generated today', () => {
    const next = computeStreakUpdate(
      { current: 5, longest: 6, lastDate: TODAY },
      TODAY,
      YESTERDAY,
    );
    expect(next).toEqual({ current: 5, longest: 6, lastDate: TODAY });
  });

  it('resets to 1 when the streak was broken (older date)', () => {
    const next = computeStreakUpdate(
      { current: 9, longest: 9, lastDate: '2025-07-10' },
      TODAY,
      YESTERDAY,
    );
    expect(next).toEqual({ current: 1, longest: 9, lastDate: TODAY });
  });

  it('resets to 1 on a first-ever generation (null lastDate)', () => {
    const next = computeStreakUpdate(
      { current: 0, longest: 0, lastDate: null },
      TODAY,
      YESTERDAY,
    );
    expect(next).toEqual({ current: 1, longest: 1, lastDate: TODAY });
  });

  it('advances longest when current overtakes it, never regresses it', () => {
    const next = computeStreakUpdate(
      { current: 6, longest: 6, lastDate: YESTERDAY },
      TODAY,
      YESTERDAY,
    );
    expect(next.current).toBe(7);
    expect(next.longest).toBe(7);
  });

  it('does not mutate the previous streak object', () => {
    const prev = { current: 4, longest: 6, lastDate: YESTERDAY };
    computeStreakUpdate(prev, TODAY, YESTERDAY);
    expect(prev).toEqual({ current: 4, longest: 6, lastDate: YESTERDAY });
  });
});
