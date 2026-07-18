import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Auth: a fixed test user. The value is stable across renders (as the real memoized
// context is) so the hook's effect does not re-run on every render.
const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

vi.mock('../lib/firestore', () => ({
  getDailyAffairs: vi.fn(),
  getUserDoc: vi.fn(),
  saveDailyAffairs: vi.fn(),
}));

vi.mock('../lib/crypto', () => ({
  decryptApiKey: vi.fn(),
}));

vi.mock('../lib/gemini', () => ({
  buildDailyPrompt: vi.fn(() => 'PROMPT'),
  callGemini: vi.fn(),
  validateDailyResponse: vi.fn(),
}));

import { useDailyAffairs } from './useDailyAffairs';
import { getDailyAffairs, getUserDoc, saveDailyAffairs } from '../lib/firestore';
import { decryptApiKey } from '../lib/crypto';
import { callGemini, validateDailyResponse } from '../lib/gemini';

const DATE = '2025-07-18';
const EXAM = 'all';
const CATEGORIES = [
  { name: 'X', icon: '💰', items: [{ title: 't', detail: 'd', importance: 'low', tags: [] }] },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDailyAffairs', () => {
  it('cache hit: returns cached data and never calls Gemini', async () => {
    const cached = { date: DATE, examType: EXAM, categories: CATEGORIES };
    getDailyAffairs.mockResolvedValue(cached);
    const onGenerated = vi.fn();

    const { result } = renderHook(() => useDailyAffairs(DATE, EXAM, { onGenerated }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(cached);

    // Even an explicit generate() with a warm cache must not call Gemini.
    await act(async () => {
      await result.current.generate();
    });

    expect(callGemini).not.toHaveBeenCalled();
    expect(saveDailyAffairs).not.toHaveBeenCalled();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('cache miss: generate() calls Gemini, validates, saves, records streak', async () => {
    getDailyAffairs.mockResolvedValue(null);
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ categories: CATEGORIES });
    validateDailyResponse.mockImplementation((raw) => raw);
    saveDailyAffairs.mockResolvedValue();
    const onGenerated = vi.fn();

    const { result } = renderHook(() => useDailyAffairs(DATE, EXAM, { onGenerated }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull(); // empty state until generated

    await act(async () => {
      await result.current.generate();
    });

    expect(decryptApiKey).toHaveBeenCalledWith('encrypted', 'test-uid');
    expect(callGemini).toHaveBeenCalledWith('plain-key', 'PROMPT');
    expect(saveDailyAffairs).toHaveBeenCalledWith('test-uid', DATE, EXAM, CATEGORIES);
    expect(result.current.data).toEqual({ date: DATE, examType: EXAM, categories: CATEGORIES });
    expect(onGenerated).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('parse error: invalid response sets error and never writes to Firestore', async () => {
    getDailyAffairs.mockResolvedValue(null);
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ bad: true });
    validateDailyResponse.mockImplementation(() => {
      throw new Error('bad shape');
    });
    const onGenerated = vi.fn();

    const { result } = renderHook(() => useDailyAffairs(DATE, EXAM, { onGenerated }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.generate();
    });

    expect(saveDailyAffairs).not.toHaveBeenCalled();
    expect(onGenerated).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
