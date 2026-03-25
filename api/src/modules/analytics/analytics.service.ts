import { Injectable } from '@nestjs/common';

import { AnalyticsRepository } from './analytics.repository.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getSummary() {
    return this.repository.getSummary();
  }

  async listZoneCurrentState(filters: { zoneId?: string; limit?: number } = {}) {
    return this.repository.listZoneCurrentState(filters);
  }

  async listZoneAggregates(filters: { zoneId?: string; limit?: number } = {}) {
    return this.repository.listZoneAggregates(filters);
  }
}

