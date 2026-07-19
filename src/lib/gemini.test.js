import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  buildDailyPrompt,
  validateDailyResponse,
  buildMcqPrompt,
  validateMcqResponse,
  resolveModelCandidates,
  callGemini,
  geminiErrorMessage,
  validateApiKey,
  resetModelCache,
  GeminiCallError,
} from './gemini';
import { GeminiParseError } from './firestore';

// Build a fake fetch Response with a given status and JSON body.
function res(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

// A well-formed generateContent success body wrapping arbitrary JSON text.
function genContent(obj) {
  return res(200, {
    candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }],
  });
}

const OK_DAILY = { categories: [{ name: 'X', icon: '💰', items: [{ title: 't', detail: 'd', importance: 'low', tags: [] }] }] };
// A ListModels body advertising two generateContent-capable models.
const LIST_BODY = {
  models: [
    { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
  ],
};

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

const validMcq = {
  questions: [
    {
      question: 'Who is the current RBI Governor?',
      options: ['Shaktikanta Das', 'Urjit Patel', 'Raghuram Rajan', 'D. Subbarao'],
      correctIndex: 0,
      explanation: 'Shaktikanta Das has served as RBI Governor.',
      category: 'Economy & Finance',
    },
  ],
};

describe('buildMcqPrompt', () => {
  it('includes the date and asks for JSON only', () => {
    const prompt = buildMcqPrompt('2025-07-18', 'banking');
    expect(prompt).toContain('2025-07-18');
    expect(prompt).toContain('Banking');
    expect(prompt.toLowerCase()).toContain('json only');
  });
});

describe('validateMcqResponse', () => {
  it('returns the object unchanged for a valid response', () => {
    expect(validateMcqResponse(validMcq)).toBe(validMcq);
  });

  it('throws GeminiParseError when questions array is missing', () => {
    expect(() => validateMcqResponse({ foo: 'bar' })).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when questions is empty', () => {
    expect(() => validateMcqResponse({ questions: [] })).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when options length is not 4', () => {
    const bad = {
      questions: [
        { question: 'q', options: ['a', 'b', 'c'], correctIndex: 0, explanation: 'e', category: 'c' },
      ],
    };
    expect(() => validateMcqResponse(bad)).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when correctIndex is out of range', () => {
    const bad = {
      questions: [
        { question: 'q', options: ['a', 'b', 'c', 'd'], correctIndex: 4, explanation: 'e', category: 'c' },
      ],
    };
    expect(() => validateMcqResponse(bad)).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when correctIndex is not an integer', () => {
    const bad = {
      questions: [
        { question: 'q', options: ['a', 'b', 'c', 'd'], correctIndex: 1.5, explanation: 'e', category: 'c' },
      ],
    };
    expect(() => validateMcqResponse(bad)).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when a question is missing its category', () => {
    const bad = {
      questions: [
        { question: 'q', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'e' },
      ],
    };
    expect(() => validateMcqResponse(bad)).toThrow(GeminiParseError);
  });

  it('throws GeminiParseError when an option is not a string', () => {
    const bad = {
      questions: [
        { question: 'q', options: ['a', 'b', 'c', 5], correctIndex: 0, explanation: 'e', category: 'c' },
      ],
    };
    expect(() => validateMcqResponse(bad)).toThrow(GeminiParseError);
  });
});

describe('resolveModelCandidates', () => {
  beforeEach(() => resetModelCache());
  afterEach(() => vi.unstubAllGlobals());

  it('ranks preferred -latest aliases first and always appends a fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, LIST_BODY)));
    const models = await resolveModelCandidates('key');
    expect(models[0]).toBe('gemini-flash-latest');
    expect(models).toContain('gemini-2.5-flash');
    // De-duplicated, and the hard fallback is present as a last resort.
    expect(new Set(models).size).toBe(models.length);
    expect(models).toContain('gemini-flash-latest');
  });

  it('falls back to defaults when ListModels fails (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(403, {})));
    const models = await resolveModelCandidates('key');
    expect(models.length).toBeGreaterThan(0);
    expect(models).toContain('gemini-flash-latest');
  });
});

describe('callGemini model fallback', () => {
  beforeEach(() => resetModelCache());
  afterEach(() => vi.unstubAllGlobals());

  it('walks to the next model when the first returns 404, and succeeds', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('/models?key=')) return res(200, LIST_BODY);
      if (url.includes('gemini-flash-latest:generateContent')) return res(404, {});
      if (url.includes('gemini-2.5-flash:generateContent')) return genContent(OK_DAILY);
      return res(500, {});
    });
    vi.stubGlobal('fetch', fetchMock);

    const out = await callGemini('key', 'prompt');
    expect(out).toEqual(OK_DAILY);
    // Tried the retired model, then the next candidate.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('gemini-2.5-flash:generateContent'),
      expect.anything(),
    );
  });

  it('stops immediately on a key-level status (403) without trying more models', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('/models?key=')) return res(200, LIST_BODY);
      return res(403, {}); // every generateContent rejected
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(callGemini('key', 'prompt')).rejects.toMatchObject({
      name: 'GeminiCallError',
      status: 403,
    });
    // Only one generateContent attempt (plus the ListModels call).
    const genCalls = fetchMock.mock.calls.filter(([u]) => u.includes('generateContent'));
    expect(genCalls).toHaveLength(1);
  });

  it('throws the last error when every model fails with a model-level status', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('/models?key=')) return res(200, LIST_BODY);
      return res(404, {}); // all models retired
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(callGemini('key', 'prompt')).rejects.toMatchObject({
      name: 'GeminiCallError',
      status: 404,
    });
  });
});

describe('geminiErrorMessage', () => {
  it('maps key-level statuses to actionable text', () => {
    expect(geminiErrorMessage({ status: 400 })).toMatch(/invalid/i);
    expect(geminiErrorMessage({ status: 403 })).toMatch(/rejected/i);
    expect(geminiErrorMessage({ status: 429 })).toMatch(/quota/i);
  });

  it('falls back to a generic message for unknown/null status', () => {
    expect(geminiErrorMessage({ status: null })).toMatch(/unavailable/i);
    expect(geminiErrorMessage(new GeminiCallError('x'))).toMatch(/unavailable/i);
  });
});

describe('validateApiKey', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns ok:true when ListModels succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, LIST_BODY)));
    expect(await validateApiKey('key')).toEqual({ ok: true });
  });

  it('returns the HTTP status when the key is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(400, {})));
    expect(await validateApiKey('key')).toEqual({ ok: false, status: 400 });
  });

  it('flags a network failure as inconclusive (not invalid)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await validateApiKey('key')).toEqual({ ok: false, network: true });
  });
});
