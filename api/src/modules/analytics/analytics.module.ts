import { Module } from '@nestjs/common';

import { EventConnectorsModule } from '../events/event-connectors.module.js';
import { InternalEventsModule } from '../events/internal-events.module.js';

import { AnalyticsProjectionService } from './analytics-projection.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { AnomalyAlertProjectionService } from './anomaly-alert-projection.service.js';

@Module({
  imports: [InternalEventsModule, EventConnectorsModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsRepository,
    AnalyticsService,
    AnalyticsProjectionService,
    AnomalyAlertProjectionService,
  ],
  exports: [AnalyticsService, AnalyticsProjectionService, AnomalyAlertProjectionService],
})
export class AnalyticsModule {}

