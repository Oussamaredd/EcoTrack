import { Module } from '@nestjs/common';

import { MonitoringModule } from '../monitoring/monitoring.module.js';

import { EventConnectorsRepository } from './event-connectors.repository.js';
import { EventConnectorsService } from './event-connectors.service.js';
import { InternalEventsModule } from './internal-events.module.js';

@Module({
  imports: [InternalEventsModule, MonitoringModule],
  providers: [EventConnectorsRepository, EventConnectorsService],
  exports: [EventConnectorsService],
})
export class EventConnectorsModule {}
