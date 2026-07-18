import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

vi.mock('../lib/firestore', () => ({
  getMonthlyOverview: vi.fn(),
  saveMonthlyOverview: vi.fn(),
  getDailyAffairs: vi.fn(),
  getUserDoc: vi.fn(),
  // Named export useDailyAffairs imports at module load (unused here):
  saveDailyAffairs: vi.fn(),
}));

vi.mock('../lib/crypto', () => ({
  decryptApiKey: vi.fn(),
}));

vi.mock('../lib/gemini', () => ({
  buildMonthlyPrompt: vi.fn(() => 'MONTHLY_PROMPT'),
  callGemini: vi.fn(),
  validateMonthlyResponse: vi.fn(),
  // Named exports useDailyAffairs imports at module load (unused here):
  buildDailyPrompt: vi.fn(),
  validateDailyResponse: vi.fn(),
}));

import { useMonthlyOverview } from './useMonthlyOverview';
import {
  getMonthlyOverview,
  saveMonthlyOverview,
  getDailyAffairs,
  getUserDoc,
} from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import { callGemini, validateMonthlyResponse } from '../lib/gemini';

const EXAM = 'all';
const OVERVIEW = {
  keyTopics: Array.from({ length: 12 }, (_, i) => `t${i}`),
  revisionPoints: Array.from({ length: 55 }, (_, i) => `p${i}`),
  categorySummaries: { Economy: 'Busy month.' },
  totalDays: 30,
};
const DAY = { date: '2025-07-14', examType: EXAM, categories: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMonthlyOverview', () => {
  it('cache hit: loads cached overview on mount and never calls Gemini on generate', async () => {
    getMonthlyOverview.mockResolvedValue(OVERVIEW);

    const { result } = renderHook(() => useMonthlyOverview(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.overview).toEqual(OVERVIEW);

    await act(async () => {
      await result.current.generate();
    });

    expect(callGemini).not.toHaveBeenCalled();
    expect(saveMonthlyOverview).not.toHaveBeenCalled();
    // Key is never decrypted when the cache is warm.
    expect(decryptApiKey).not.toHaveBeenCalled();
  });

  it('cache miss: generate() gathers the month, calls Gemini, validates and caches', async () => {
    getMonthlyOverview.mockResolvedValue(null);
    getDailyAffairs.mockResolvedValue(DAY); // every day of the month resolves to content
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue(OVERVIEW);
    validateMonthlyResponse.mockImplementation((raw) => raw);
    saveMonthlyOverview.mockResolvedValue();

    const { result } = renderHook(() => useMonthlyOverview(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.overview).toBeNull();

    let returned;
    await act(async () => {
      returned = await result.current.generate();
    });

    expect(decryptApiKey).toHaveBeenCalledWith('encrypted', 'test-uid');
    expect(callGemini).toHaveBeenCalledWith('plain-key', 'MONTHLY_PROMPT');
    expect(saveMonthlyOverview).toHaveBeenCalledWith(
      'test-uid',
      result.current.month,
      EXAM,
      OVERVIEW,
    );
    expect(returned).toEqual(OVERVIEW);
    expect(result.current.overview).toEqual(OVERVIEW);
    expect(result.current.error).toBeNull();
  });

  it('parse error: invalid response sets error and never writes to cache', async () => {
    getMonthlyOverview.mockResolvedValue(null);
    getDailyAffairs.mockResolvedValue(DAY);
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ bad: true });
    validateMonthlyResponse.mockImplementation(() => {
      throw new Error('bad shape');
    });

    const { result } = renderHook(() => useMonthlyOverview(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.generate();
    });

    expect(saveMonthlyOverview).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
    expect(returned).toBeNull();
  });

  it('missing API key: never calls Gemini, sets error', async () => {
    getMonthlyOverview.mockResolvedValue(null);
    getDailyAffairs.mockResolvedValue(DAY);
    getUserDoc.mockResolvedValue({}); // no geminiApiKey

    const { result } = renderHook(() => useMonthlyOverview(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.generate();
    });

    expect(decryptApiKey).not.toHaveBeenCalled();
    expect(callGemini).not.toHaveBeenCalled();
    expect(saveMonthlyOverview).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('empty month: no archived days -> Gemini not called, error set', async () => {
    getMonthlyOverview.mockResolvedValue(null);
    getDailyAffairs.mockResolvedValue(null); // no content for any day

    const { result } = renderHook(() => useMonthlyOverview(EXAM));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.generate();
    });

    expect(getUserDoc).not.toHaveBeenCalled();
    expect(callGemini).not.toHaveBeenCalled();
    expect(saveMonthlyOverview).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
