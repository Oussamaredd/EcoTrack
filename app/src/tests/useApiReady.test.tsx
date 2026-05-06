import { StrictMode } from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { resetApiReadyStoresForTests, useApiReady } from '../hooks/useApiReady';

const createResponse = (ok: boolean, status = 200) =>
  ({
    ok,
    status,
  }) as Response;

const advanceBootstrapProbe = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

describe('useApiReady', () => {
  beforeEach(() => {
    resetApiReadyStoresForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetApiReadyStoresForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('returns ready state when /api/health/ready responds successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApiReady('http://localhost:3001'));
    await advanceBootstrapProbe();

    await waitFor(() => {
      expect(result.current.isApiReady).toBe(true);
      expect(result.current.apiReachability).toBe('ready');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/health/ready',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      }),
    );
  });

  test('marks connection failures as degraded until a retry succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(createResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApiReady('http://localhost:3001'));
    await advanceBootstrapProbe();

    await waitFor(() => {
      expect(result.current.apiReachability).toBe('degraded');
      expect(result.current.isApiReady).toBe(false);
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isApiReady).toBe(true);
      expect(result.current.apiReachability).toBe('ready');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test.each([500, 502, 503, 504])(
    'treats HTTP %s readiness responses as expected cold-start not-ready states',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(createResponse(false, status))
        .mockResolvedValue(createResponse(true));
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() => useApiReady('http://localhost:3001'));
      await advanceBootstrapProbe();

      await waitFor(() => {
        expect(result.current.apiReachability).toBe('degraded');
        expect(result.current.isApiReady).toBe(false);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(750);
      });

      await waitFor(() => {
        expect(result.current.apiReachability).toBe('ready');
        expect(result.current.isApiReady).toBe(true);
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  test('dedupes active probe loops by API base in dev StrictMode', async () => {
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(() => {
          // Keep the probe pending so duplicate in-flight requests are visible.
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    function ReadinessConsumers() {
      useApiReady('http://localhost:3001');
      useApiReady('http://localhost:3001/api');
      return null;
    }

    const { unmount } = render(
      <StrictMode>
        <ReadinessConsumers />
      </StrictMode>,
    );

    await advanceBootstrapProbe();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('online and visible-tab events reprobe the shared readiness state', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(createResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApiReady('http://localhost:3001'));
    await advanceBootstrapProbe();

    await waitFor(() => {
      expect(result.current.apiReachability).toBe('degraded');
    });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.apiReachability).toBe('ready');
      expect(result.current.isApiReady).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
