import { Injectable } from '@nestjs/common';

import { CACHE_NAMESPACES } from '../performance/cache.constants.js';
import { CacheService } from '../performance/cache.service.js';

import { AnalyticsRepository } from './analytics.repository.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async getSummary() {
    return this.cacheService.getOrLoad({
      key: 'summary',
      loader: () => this.repository.getSummary(),
      namespace: CACHE_NAMESPACES.analytics,
      profile: 'analytics',
    });
  }

  async listZoneCurrentState(filters: { zoneId?: string; limit?: number } = {}) {
    return this.cacheService.getOrLoad({
      key: `zones-current:${JSON.stringify(filters)}`,
      loader: () => this.repository.listZoneCurrentState(filters),
      namespace: CACHE_NAMESPACES.analytics,
      profile: 'analytics',
    });
  }

  async listZoneAggregates(filters: { zoneId?: string; limit?: number } = {}) {
    return this.cacheService.getOrLoad({
      key: `zones-aggregates:${JSON.stringify(filters)}`,
      loader: () => this.repository.listZoneAggregates(filters),
      namespace: CACHE_NAMESPACES.analytics,
      profile: 'analytics',
    });
  }
}

