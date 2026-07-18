import { describe, it, expect } from 'vitest';
import { buildDailyPrompt, validateDailyResponse } from './gemini';
import { GeminiParseError } from './firestore';

const validResponse = {
  categories: [
    {
      name: 'Economy & Finance',
      icon: '💰',
      items: [
        {
          title: 'RBI keeps repo rate unchanged',
          detail: 'The Reserve Bank of India held the repo rate steady.',
          importance: 'high',
          tags: ['RBI', 'economy'],
        },
      ],
    },
  ],
};

describe('buildDailyPrompt', () => {
  it('includes the date and asks for JSON only', () => {
    const prompt = buildDailyPrompt('2025-07-18', 'banking');
    expect(prompt).toContain('2025-07-18');
    expect(prompt).toContain('Banking');
    expect(prompt.toLowerCase()).toContain('json only');
  });
});

describe('validateDailyResponse', () => {
  it('returns the object unchanged for a valid response', () => {
    expect(validateDailyResponse(validResponse)).toBe(validResponse);
  });

  it('throws GeminiParseError when categories array is missing', () => {
    expect(() => validateDailyResponse({ foo: 'bar' })).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when categories is empty', () => {
    expect(() => validateDailyResponse({ categories: [] })).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when a category is missing its icon', () => {
    const bad = { categories: [{ name: 'X', items: [{ title: 't', detail: 'd', importance: 'low', tags: [] }] }] };
    expect(() => validateDailyResponse(bad)).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when an item importance is out of range', () => {
    const bad = {
      categories: [
        { name: 'X', icon: '💰', items: [{ title: 't', detail: 'd', importance: 'urgent', tags: [] }] },
      ],
    };
    expect(() => validateDailyResponse(bad)).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when an item is missing tags', () => {
    const bad = {
      categories: [
        { name: 'X', icon: '💰', items: [{ title: 't', detail: 'd', importance: 'low' }] },
      ],
    };
    expect(() => validateDailyResponse(bad)).toThrow(GeminiParseError);
  });
});
