import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { normalizeSearchTerm, parsePaginationParams } from '../common/http/pagination.js';

import { ContainersService } from './containers.service.js';
import { CreateContainerDto } from './dto/create-container.dto.js';
import { RecordContainerMeasurementDto } from './dto/record-container-measurement.dto.js';
import { UpdateContainerDto } from './dto/update-container.dto.js';
import { UpsertContainerSensorDto } from './dto/upsert-container-sensor.dto.js';

@Controller('containers')
export class ContainersController {
  constructor(@Inject(ContainersService) private readonly containersService: ContainersService) {}

  @Get('types')
  async listTypes() {
    return { containerTypes: await this.containersService.listTypes() };
  }

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('zoneId') zoneId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = parsePaginationParams(page, pageSize);
    const { items, total } = await this.containersService.list({
      search: normalizeSearchTerm(q),
      zoneId,
      status: normalizeSearchTerm(status),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      containers: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Post()
  async create(@Body() dto: CreateContainerDto) {
    return this.containersService.create(dto);
  }

  @Get(':id/telemetry')
  async telemetry(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    return this.containersService.getTelemetry(id, limit);
  }

  @Post(':id/sensors')
  async upsertSensor(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpsertContainerSensorDto,
  ) {
    return this.containersService.upsertSensor(id, dto);
  }

  @Post(':id/measurements')
  async recordMeasurement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RecordContainerMeasurementDto,
  ) {
    return this.containersService.recordMeasurement(id, dto);
  }

  @Put(':id')
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateContainerDto) {
    return this.containersService.update(id, dto);
  }
}
