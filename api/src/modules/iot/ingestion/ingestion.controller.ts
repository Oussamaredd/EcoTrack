import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';

import { BatchIngestDto, IngestMeasurementDto } from './dto/ingest-measurement.dto.js';
import { BatchIngestResponseDto, IngestResponseDto, IngestionHealthDto } from './dto/ingestion-response.dto.js';
import { IngestionService } from './ingestion.service.js';

@Controller('iot/v1')
export class IngestionController {
  constructor(@Inject(IngestionService) private readonly ingestionService: IngestionService) {}

  @Post('measurements')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestMeasurement(@Body() dto: IngestMeasurementDto): Promise<IngestResponseDto> {
    return this.ingestionService.ingestSingle(dto);
  }

  @Post('measurements/batch')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestBatch(@Body() dto: BatchIngestDto): Promise<BatchIngestResponseDto> {
    return this.ingestionService.ingestBatch(dto.measurements);
  }

  @Get('health')
  async health(): Promise<IngestionHealthDto> {
    return this.ingestionService.getHealth();
  }
}
