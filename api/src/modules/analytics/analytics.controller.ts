import { Controller, DefaultValuePipe, Get, Inject, ParseIntPipe, Query } from '@nestjs/common';

import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('zones/current')
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

