import { describe, it, expect } from 'vitest';
import { buildWeeklyDigestPrompt, validateWeeklyDigestResponse } from './gemini';
import { GeminiParseError } from './firestore';

const VALID = {
  weekSummary: 'A busy week.',
  keyTopics: ['t1', 't2', 't3', 't4', 't5'],
  revisionPoints: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
};

describe('validateWeeklyDigestResponse', () => {
  it('returns a valid response unchanged', () => {
    expect(validateWeeklyDigestResponse(VALID)).toBe(VALID);
  });

  it('throws on a non-object', () => {
    expect(() => validateWeeklyDigestResponse([])).toThrow(GeminiParseError);
    expect(() => validateWeeklyDigestResponse(null)).toThrow(GeminiParseError);
  });

  it('throws when weekSummary is missing or not a string', () => {
    expect(() => validateWeeklyDigestResponse({ ...VALID, weekSummary: '' })).toThrow(
      GeminiParseError,
    );
    expect(() => validateWeeklyDigestResponse({ ...VALID, weekSummary: 5 })).toThrow(
      GeminiParseError,
    );
  });

  it('throws when keyTopics has fewer than 5 items or non-strings', () => {
    expect(() =>
      validateWeeklyDigestResponse({ ...VALID, keyTopics: ['a', 'b'] }),
    ).toThrow(GeminiParseError);
    expect(() =>
      validateWeeklyDigestResponse({ ...VALID, keyTopics: [1, 2, 3, 4, 5] }),
    ).toThrow(GeminiParseError);
  });

  it('throws when revisionPoints has fewer than 10 items', () => {
    expect(() =>
      validateWeeklyDigestResponse({ ...VALID, revisionPoints: ['a', 'b', 'c'] }),
    ).toThrow(GeminiParseError);
  });
});

describe('buildWeeklyDigestPrompt', () => {
  it('is a pure function of its arguments (no fetch/Firestore) and includes the week', () => {
    const weekContent = [
      {
        date: '2025-07-14',
        categories: [
          { name: 'Economy', items: [{ title: 'RBI holds rate', detail: 'At 6.5%.' }] },
        ],
      },
    ];
    const prompt = buildWeeklyDigestPrompt('2025-W29', 'banking', weekContent);
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('2025-W29');
    expect(prompt).toContain('RBI holds rate');
  });

  it('tolerates empty week content without throwing', () => {
    const prompt = buildWeeklyDigestPrompt('2025-W29', 'all', []);
    expect(prompt).toContain('(no items)');
  });
});
