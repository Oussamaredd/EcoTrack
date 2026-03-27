import { Controller, DefaultValuePipe, Get, Inject, ParseIntPipe, Query } from '@nestjs/common';

import { ResponseCache } from '../performance/http-response-cache.decorator.js';

import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ResponseCache({
    cacheTags: ['analytics', 'analytics-summary'],
    cdnMaxAgeSeconds: 300,
    maxAgeSeconds: 60,
    scope: 'public',
    staleWhileRevalidateSeconds: 300,
  })
  async getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('zones/current')
  @ResponseCache({
    cacheTags: ['analytics', 'analytics-zone-current'],
    cdnMaxAgeSeconds: 300,
    maxAgeSeconds: 60,
    scope: 'public',
    staleWhileRevalidateSeconds: 300,
  })
  async getZoneCurrentState(
    @Query('zoneId') zoneId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return {
      zones: await this.analyticsService.listZoneCurrentState({
        zoneId: zoneId?.trim() || undefined,
        limit: limit ?? 20,
      }),
    };
  }

  @Get('zones/aggregates')
  @ResponseCache({
    cacheTags: ['analytics', 'analytics-zone-aggregates'],
    cdnMaxAgeSeconds: 300,
    maxAgeSeconds: 60,
    scope: 'public',
    staleWhileRevalidateSeconds: 300,
  })
  async getZoneAggregates(
    @Query('zoneId') zoneId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return {
      aggregates: await this.analyticsService.listZoneAggregates({
        zoneId: zoneId?.trim() || undefined,
        limit: limit ?? 50,
      }),
    };
  }
}

