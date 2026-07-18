import { describe, it, expect } from 'vitest';
import { buildMonthlyPrompt, validateMonthlyResponse } from './gemini';
import { GeminiParseError } from './firestore';

const keyTopics = Array.from({ length: 12 }, (_, i) => `topic-${i + 1}`);
const revisionPoints = Array.from({ length: 55 }, (_, i) => `point-${i + 1}`);

const VALID = {
  keyTopics,
  revisionPoints,
  categorySummaries: { 'Economy & Finance': 'A busy month for the economy.' },
  totalDays: 30,
};

describe('validateMonthlyResponse', () => {
  it('returns a valid response unchanged', () => {
    expect(validateMonthlyResponse(VALID)).toBe(VALID);
  });

  it('throws on a non-object', () => {
    expect(() => validateMonthlyResponse([])).toThrow(GeminiParseError);
    expect(() => validateMonthlyResponse(null)).toThrow(GeminiParseError);
  });

  it('throws when keyTopics has fewer than 10 items or more than 30', () => {
    expect(() =>
      validateMonthlyResponse({ ...VALID, keyTopics: ['a', 'b', 'c'] }),
    ).toThrow(GeminiParseError);
    expect(() =>
      validateMonthlyResponse({
        ...VALID,
        keyTopics: Array.from({ length: 31 }, (_, i) => `t${i}`),
      }),
    ).toThrow(GeminiParseError);
  });

  it('throws when revisionPoints has fewer than 50 items', () => {
    expect(() =>
      validateMonthlyResponse({
        ...VALID,
        revisionPoints: Array.from({ length: 49 }, (_, i) => `p${i}`),
      }),
    ).toThrow(GeminiParseError);
  });

  it('throws when categorySummaries is missing or not an object', () => {
    expect(() =>
      validateMonthlyResponse({ ...VALID, categorySummaries: undefined }),
    ).toThrow(GeminiParseError);
    expect(() =>
      validateMonthlyResponse({ ...VALID, categorySummaries: [] }),
    ).toThrow(GeminiParseError);
    expect(() =>
      validateMonthlyResponse({ ...VALID, categorySummaries: {} }),
    ).toThrow(GeminiParseError);
  });

  it('throws when totalDays is not a non-negative integer', () => {
    expect(() => validateMonthlyResponse({ ...VALID, totalDays: '30' })).toThrow(
      GeminiParseError,
    );
    expect(() => validateMonthlyResponse({ ...VALID, totalDays: -1 })).toThrow(
      GeminiParseError,
    );
  });
});

describe('buildMonthlyPrompt', () => {
  it('is a pure function of its arguments and includes the month + an item title', () => {
    const monthContent = [
      {
        date: '2025-07-14',
        categories: [
          { name: 'Economy', items: [{ title: 'RBI holds rate', detail: 'At 6.5%.' }] },
        ],
      },
    ];
    const prompt = buildMonthlyPrompt('2025-07', 'banking', monthContent);
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('2025-07');
    expect(prompt).toContain('RBI holds rate');
  });

  it('tolerates empty month content without throwing', () => {
    const prompt = buildMonthlyPrompt('2025-07', 'all', []);
    expect(prompt).toContain('(no items)');
  });
});
