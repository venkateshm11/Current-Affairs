import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const AUTH_VALUE = { user: { uid: 'test-uid' } };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

vi.mock('../lib/firestore', () => ({
  setFcmToken: vi.fn(),
}));

vi.mock('../lib/messaging', () => ({
  isMessagingSupported: vi.fn(),
  getFcmToken: vi.fn(),
}));

import { usePushNotifications } from './usePushNotifications';
import { setFcmToken } from '../lib/firestore';
import { isMessagingSupported, getFcmToken } from '../lib/messaging';

function stubNotification(permission, requestResult) {
  const requestPermission = vi.fn().mockResolvedValue(requestResult ?? permission);
  vi.stubGlobal('Notification', { permission, requestPermission });
  return requestPermission;
}

beforeEach(() => {
  vi.clearAllMocks();
  isMessagingSupported.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePushNotifications', () => {
  it('permission granted: fetches a token and writes it to users/{uid}.fcmToken', async () => {
    stubNotification('default', 'granted');
    getFcmToken.mockResolvedValue('fcm-token-123');
    setFcmToken.mockResolvedValue();

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    await act(async () => {
      await result.current.enablePush();
    });

    expect(getFcmToken).toHaveBeenCalledTimes(1);
    expect(setFcmToken).toHaveBeenCalledWith('test-uid', 'fcm-token-123');
    expect(result.current.enabled).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('permission denied: never writes a token and sets an error', async () => {
    stubNotification('default', 'denied');

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    await act(async () => {
      await result.current.enablePush();
    });

    expect(getFcmToken).not.toHaveBeenCalled();
    expect(setFcmToken).not.toHaveBeenCalled();
    expect(result.current.enabled).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
