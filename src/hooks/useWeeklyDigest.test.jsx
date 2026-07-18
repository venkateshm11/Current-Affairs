import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

vi.mock('../lib/firestore', () => ({
  getWeeklyDigest: vi.fn(),
  saveWeeklyDigest: vi.fn(),
  getDailyAffairs: vi.fn(),
  getUserDoc: vi.fn(),
  // Named exports useDailyAffairs imports at module load (unused here):
  saveDailyAffairs: vi.fn(),
}));

vi.mock('../lib/crypto', () => ({
  decryptApiKey: vi.fn(),
}));

vi.mock('../lib/gemini', () => ({
  buildWeeklyDigestPrompt: vi.fn(() => 'DIGEST_PROMPT'),
  callGemini: vi.fn(),
  validateWeeklyDigestResponse: vi.fn(),
  // Named exports useDailyAffairs imports at module load (unused here):
  buildDailyPrompt: vi.fn(),
  validateDailyResponse: vi.fn(),
}));

import { useWeeklyDigest } from './useWeeklyDigest';
import {
  getWeeklyDigest,
  saveWeeklyDigest,
  getDailyAffairs,
  getUserDoc,
} from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import { callGemini, validateWeeklyDigestResponse } from '../lib/gemini';

const EXAM = 'all';
const DIGEST = {
  weekSummary: 'A busy week in current affairs.',
  keyTopics: ['t1', 't2', 't3', 't4', 't5'],
  revisionPoints: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
};
const DAY = { date: '2025-07-14', examType: EXAM, categories: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useWeeklyDigest', () => {
  it('cache hit: loads cached digest on mount and never calls Gemini on generate', async () => {
    getWeeklyDigest.mockResolvedValue(DIGEST);

    const { result } = renderHook(() => useWeeklyDigest(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.digest).toEqual(DIGEST);

    await act(async () => {
      await result.current.generate();
    });

    expect(callGemini).not.toHaveBeenCalled();
    expect(saveWeeklyDigest).not.toHaveBeenCalled();
    // Key is never decrypted when the cache is warm.
    expect(decryptApiKey).not.toHaveBeenCalled();
  });

  it('cache miss: generate() gathers the week, calls Gemini, validates and caches', async () => {
    getWeeklyDigest.mockResolvedValue(null);
    getDailyAffairs.mockResolvedValue(DAY); // every day of the week resolves to content
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue(DIGEST);
    validateWeeklyDigestResponse.mockImplementation((raw) => raw);
    saveWeeklyDigest.mockResolvedValue();

    const { result } = renderHook(() => useWeeklyDigest(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.digest).toBeNull();

    let returned;
    await act(async () => {
      returned = await result.current.generate();
    });

    expect(decryptApiKey).toHaveBeenCalledWith('encrypted', 'test-uid');
    expect(callGemini).toHaveBeenCalledWith('plain-key', 'DIGEST_PROMPT');
    expect(saveWeeklyDigest).toHaveBeenCalledWith(
      'test-uid',
      result.current.week,
      EXAM,
      DIGEST,
    );
    expect(returned).toEqual(DIGEST);
    expect(result.current.digest).toEqual(DIGEST);
    expect(result.current.error).toBeNull();
  });

  it('parse error: invalid response sets error and never writes to cache', async () => {
    getWeeklyDigest.mockResolvedValue(null);
    getDailyAffairs.mockResolvedValue(DAY);
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ bad: true });
    validateWeeklyDigestResponse.mockImplementation(() => {
      throw new Error('bad shape');
    });

    const { result } = renderHook(() => useWeeklyDigest(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.generate();
    });

    expect(saveWeeklyDigest).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
    expect(returned).toBeNull();
  });

  it('missing API key: never calls Gemini, sets error', async () => {
    getWeeklyDigest.mockResolvedValue(null);
    getDailyAffairs.mockResolvedValue(DAY);
    getUserDoc.mockResolvedValue({}); // no geminiApiKey

    const { result } = renderHook(() => useWeeklyDigest(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.generate();
    });

    expect(decryptApiKey).not.toHaveBeenCalled();
    expect(callGemini).not.toHaveBeenCalled();
    expect(saveWeeklyDigest).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
