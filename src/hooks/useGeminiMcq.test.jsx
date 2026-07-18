import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Auth: a fixed test user, stable across renders so the hook's effect does not re-run.
const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

vi.mock('../lib/firestore', () => ({
  getMcqCache: vi.fn(),
  getUserDoc: vi.fn(),
  saveMcqCache: vi.fn(),
}));

vi.mock('../lib/crypto', () => ({
  decryptApiKey: vi.fn(),
}));

vi.mock('../lib/gemini', () => ({
  buildMcqPrompt: vi.fn(() => 'MCQ_PROMPT'),
  callGemini: vi.fn(),
  validateMcqResponse: vi.fn(),
}));

import { useGeminiMcq } from './useGeminiMcq';
import { getMcqCache, getUserDoc, saveMcqCache } from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import { callGemini, validateMcqResponse } from '../lib/gemini';

const DATE = '2025-07-18';
const EXAM = 'all';
const QUESTIONS = [
  {
    question: 'Q1',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: 'e',
    category: 'Economy',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGeminiMcq', () => {
  it('cache hit: returns cached questions and never calls Gemini', async () => {
    getMcqCache.mockResolvedValue({ date: DATE, examType: EXAM, questions: QUESTIONS });

    const { result } = renderHook(() => useGeminiMcq(DATE, EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.questions).toEqual(QUESTIONS);

    // Even an explicit generate() with a warm cache must not call Gemini.
    await act(async () => {
      await result.current.generate();
    });

    expect(callGemini).not.toHaveBeenCalled();
    expect(saveMcqCache).not.toHaveBeenCalled();
  });

  it('cache miss: generate() calls Gemini, validates, and caches the pool', async () => {
    getMcqCache.mockResolvedValue(null);
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ questions: QUESTIONS });
    validateMcqResponse.mockImplementation((raw) => raw);
    saveMcqCache.mockResolvedValue();

    const { result } = renderHook(() => useGeminiMcq(DATE, EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.questions).toBeNull(); // empty until generated

    let returned;
    await act(async () => {
      returned = await result.current.generate();
    });

    expect(decryptApiKey).toHaveBeenCalledWith('encrypted', 'test-uid');
    expect(callGemini).toHaveBeenCalledWith('plain-key', 'MCQ_PROMPT');
    expect(saveMcqCache).toHaveBeenCalledWith('test-uid', DATE, EXAM, QUESTIONS);
    expect(result.current.questions).toEqual(QUESTIONS);
    expect(returned).toEqual(QUESTIONS);
    expect(result.current.error).toBeNull();
  });

  it('parse error: invalid response sets error and never writes to cache', async () => {
    getMcqCache.mockResolvedValue(null);
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ bad: true });
    validateMcqResponse.mockImplementation(() => {
      throw new Error('bad shape');
    });

    const { result } = renderHook(() => useGeminiMcq(DATE, EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.generate();
    });

    expect(saveMcqCache).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
    expect(returned).toBeNull();
  });
});
