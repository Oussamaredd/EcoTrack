import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../../database/database.module.js';
import { AnalyticsModule } from '../../analytics/analytics.module.js';
import { EventConnectorsModule } from '../../events/event-connectors.module.js';
import { InternalEventsModule } from '../../events/internal-events.module.js';
import { MonitoringModule } from '../../monitoring/monitoring.module.js';
import { MeasurementRollupsModule } from '../rollups/rollups.module.js';

import { ValidatedConsumerProcessorService } from './validated-consumer.processor.js';
import { InMemoryValidatedDeliveryQueue } from './validated-consumer.queue.js';
import { ValidatedConsumerRepository } from './validated-consumer.repository.js';
import { ValidatedConsumerService } from './validated-consumer.service.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AnalyticsModule,
    EventConnectorsModule,
    InternalEventsModule,
    MonitoringModule,
    MeasurementRollupsModule,
  ],
  providers: [
    ValidatedConsumerRepository,
    ValidatedConsumerProcessorService,
    ValidatedConsumerService,
    InMemoryValidatedDeliveryQueue,
  ],
  exports: [ValidatedConsumerService],
})
export class ValidatedConsumerModule {}
