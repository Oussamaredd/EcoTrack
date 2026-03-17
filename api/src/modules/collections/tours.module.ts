import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { RoutingClient } from './routing/routing.client.js';
import { TOURS_ROUTE_COORDINATION_PORT } from './tours.contract.js';
import { ToursController } from './tours.controller.js';
import { ToursRepository } from './tours.repository.js';
import { ToursService } from './tours.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ToursController],
  providers: [
    ToursRepository,
    RoutingClient,
    ToursService,
    {
      provide: TOURS_ROUTE_COORDINATION_PORT,
      useExisting: ToursService,
    },
  ],
  exports: [TOURS_ROUTE_COORDINATION_PORT, RoutingClient],
})
export class ToursModule {}

