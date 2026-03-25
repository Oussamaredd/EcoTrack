import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import { InternalEventsModule } from '../events/internal-events.module.js';

import { CollectionsDomainRepository } from './collections-domain.repository.js';
import { RoutingClient } from './routing/routing.client.js';
import { ToursCommandService } from './tours.command.service.js';
import { TOURS_ROUTE_COORDINATION_PORT } from './tours.contract.js';
import { ToursController } from './tours.controller.js';
import { ToursQueryService } from './tours.query.service.js';
import { ToursRepository } from './tours.repository.js';
import { ToursService } from './tours.service.js';

@Module({
  imports: [AuthModule, ConfigModule, InternalEventsModule],
  controllers: [ToursController],
  providers: [
    ToursRepository,
    CollectionsDomainRepository,
    RoutingClient,
    ToursCommandService,
    ToursQueryService,
    ToursService,
    {
      provide: TOURS_ROUTE_COORDINATION_PORT,
      useExisting: ToursService,
    },
  ],
  exports: [TOURS_ROUTE_COORDINATION_PORT, RoutingClient],
})
export class ToursModule {}

