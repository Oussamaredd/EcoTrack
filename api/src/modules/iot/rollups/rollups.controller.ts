import { Controller, Get, Inject, Query } from '@nestjs/common';

import { MeasurementRollupsService } from './rollups.service.js';

@Controller('iot/v1/rollups')
export class MeasurementRollupsController {
  constructor(
    @Inject(MeasurementRollupsService)
    private readonly measurementRollupsService: MeasurementRollupsService,
  ) {}

  @Get('latest')
  async listLatestRollups(
    @Query('containerId') containerId?: string,
    @Query('deviceUid') deviceUid?: string,
    @Query('limit') limit?: string,
  ) {
    return this.measurementRollupsService.listLatestRollups({
      containerId,
      deviceUid,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
