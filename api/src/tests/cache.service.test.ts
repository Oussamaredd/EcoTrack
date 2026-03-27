import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it } from 'vitest';

import { CacheService } from '../modules/performance/cache.service.js';

const createConfigService = (overrides: Record<string, unknown> = {}) =>
  ({
    get: (key: string) => overrides[key],
  }) as ConfigService;

describe('CacheService', () => {
  afterEach(async () => {
    // Test instances do not configure Redis, so shutdown is a no-op.
  });

  it('returns a cached in-memory value before ttl expiry', async () => {
    const cacheService = new CacheService(createConfigService());
    let loaderCalls = 0;

    const first = await cacheService.getOrLoad({
      key: 'dashboard',
      loader: async () => ({ calls: ++loaderCalls }),
      namespace: 'dashboard',
      profile: 'dashboard',
    });
    const second = await cacheService.getOrLoad({
      key: 'dashboard',
      loader: async () => ({ calls: ++loaderCalls }),
      namespace: 'dashboard',
      profile: 'dashboard',
    });

    expect(first).toEqual({ calls: 1 });
    expect(second).toEqual({ calls: 1 });
    expect(loaderCalls).toBe(1);
    expect(cacheService.getMetricsSnapshot().readsByTier.memory).toBe(1);
  });

  it('invalidates a namespace and forces a fresh load', async () => {
    const cacheService = new CacheService(createConfigService());
    let loaderCalls = 0;

    await cacheService.getOrLoad({
      key: 'dashboard',
      loader: async () => ({ calls: ++loaderCalls }),
      namespace: 'dashboard',
      profile: 'dashboard',
    });

    await cacheService.invalidateNamespace('dashboard');

    const refreshed = await cacheService.getOrLoad({
      key: 'dashboard',
      loader: async () => ({ calls: ++loaderCalls }),
      namespace: 'dashboard',
      profile: 'dashboard',
    });

    expect(refreshed).toEqual({ calls: 2 });
    expect(loaderCalls).toBe(2);
    expect(cacheService.getMetricsSnapshot().invalidationsTotal).toBe(1);
  });
});
