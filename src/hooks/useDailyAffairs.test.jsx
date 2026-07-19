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
  getSharedDaily: vi.fn(),
  getUserDoc: vi.fn(),
  saveDailyAffairs: vi.fn(),
  saveSharedDaily: vi.fn(),
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
import {
  getDailyAffairs,
  getSharedDaily,
  getUserDoc,
  saveDailyAffairs,
  saveSharedDaily,
} from '../lib/firestore';
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
  it('own-cache hit: shared pool not read, Gemini not called, source is own', async () => {
    const cached = { date: DATE, examType: EXAM, categories: CATEGORIES };
    getDailyAffairs.mockResolvedValue(cached);
    const onGenerated = vi.fn();

    const { result } = renderHook(() => useDailyAffairs(DATE, EXAM, { onGenerated }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(cached);
    expect(result.current.source).toBe('own');

    // Even an explicit generate() with a warm cache must not read the pool or call Gemini.
    await act(async () => {
      await result.current.generate();
    });

    expect(getSharedDaily).not.toHaveBeenCalled();
    expect(callGemini).not.toHaveBeenCalled();
    expect(saveDailyAffairs).not.toHaveBeenCalled();
    expect(saveSharedDaily).not.toHaveBeenCalled();
    expect(onGenerated).not.toHaveBeenCalled();
    expect(result.current.source).toBe('own');
  });

  it('own-cache miss, shared hit: copies to own cache, Gemini not called, source is community', async () => {
    getDailyAffairs.mockResolvedValue(null);
    getSharedDaily.mockResolvedValue({ date: DATE, examType: EXAM, categories: CATEGORIES });
    validateDailyResponse.mockImplementation((raw) => raw);
    saveDailyAffairs.mockResolvedValue();
    const onGenerated = vi.fn();

    const { result } = renderHook(() => useDailyAffairs(DATE, EXAM, { onGenerated }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.generate();
    });

    expect(saveDailyAffairs).toHaveBeenCalledWith('test-uid', DATE, EXAM, CATEGORIES);
    expect(callGemini).not.toHaveBeenCalled();
    expect(saveSharedDaily).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ date: DATE, examType: EXAM, categories: CATEGORIES });
    expect(result.current.source).toBe('community');
    expect(onGenerated).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('both caches miss: Gemini called, saved to own cache AND shared pool, source is gemini', async () => {
    getDailyAffairs.mockResolvedValue(null);
    getSharedDaily.mockResolvedValue(null);
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ categories: CATEGORIES });
    validateDailyResponse.mockImplementation((raw) => raw);
    saveDailyAffairs.mockResolvedValue();
    saveSharedDaily.mockResolvedValue();
    const onGenerated = vi.fn();

    const { result } = renderHook(() => useDailyAffairs(DATE, EXAM, { onGenerated }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull(); // empty state until generated
    expect(result.current.source).toBeNull();

    await act(async () => {
      await result.current.generate();
    });

    expect(decryptApiKey).toHaveBeenCalledWith('encrypted', 'test-uid');
    expect(callGemini).toHaveBeenCalledWith('plain-key', 'PROMPT');
    expect(saveDailyAffairs).toHaveBeenCalledWith('test-uid', DATE, EXAM, CATEGORIES);
    expect(saveSharedDaily).toHaveBeenCalledWith(DATE, EXAM, CATEGORIES);
    expect(result.current.data).toEqual({ date: DATE, examType: EXAM, categories: CATEGORIES });
    expect(result.current.source).toBe('gemini');
    expect(onGenerated).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('shared hit with invalid shape: treated as a miss, falls through to Gemini, does not crash', async () => {
    getDailyAffairs.mockResolvedValue(null);
    getSharedDaily.mockResolvedValue({ date: DATE, examType: EXAM, categories: 'corrupt' });
    getUserDoc.mockResolvedValue({ geminiApiKey: 'encrypted' });
    decryptApiKey.mockResolvedValue('plain-key');
    callGemini.mockResolvedValue({ categories: CATEGORIES });
    // First call (validating the corrupt shared doc) throws; second call (Gemini response) passes.
    validateDailyResponse
      .mockImplementationOnce(() => {
        throw new Error('bad shared shape');
      })
      .mockImplementation((raw) => raw);
    saveDailyAffairs.mockResolvedValue();
    saveSharedDaily.mockResolvedValue();
    const onGenerated = vi.fn();

    const { result } = renderHook(() => useDailyAffairs(DATE, EXAM, { onGenerated }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.generate();
    });

    expect(callGemini).toHaveBeenCalledWith('plain-key', 'PROMPT');
    expect(saveDailyAffairs).toHaveBeenCalledWith('test-uid', DATE, EXAM, CATEGORIES);
    // The shared doc existed (was corrupt), so we must NOT overwrite the pool.
    expect(saveSharedDaily).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ date: DATE, examType: EXAM, categories: CATEGORIES });
    expect(result.current.source).toBe('gemini');
    expect(result.current.error).toBeNull();
  });

  it('parse error: invalid Gemini response sets error and never writes to Firestore', async () => {
    getDailyAffairs.mockResolvedValue(null);
    getSharedDaily.mockResolvedValue(null);
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
    expect(saveSharedDaily).not.toHaveBeenCalled();
    expect(onGenerated).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
