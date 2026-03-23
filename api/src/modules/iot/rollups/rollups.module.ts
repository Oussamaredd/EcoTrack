import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../../database/database.module.js';
import { InternalEventsModule } from '../../events/internal-events.module.js';

import { MeasurementRollupsController } from './rollups.controller.js';
import { MeasurementRollupsRepository } from './rollups.repository.js';
import { MeasurementRollupsService } from './rollups.service.js';

@Module({
  imports: [DatabaseModule, InternalEventsModule],
  controllers: [MeasurementRollupsController],
  providers: [MeasurementRollupsRepository, MeasurementRollupsService],
  exports: [MeasurementRollupsService],
})
export class MeasurementRollupsModule {}
