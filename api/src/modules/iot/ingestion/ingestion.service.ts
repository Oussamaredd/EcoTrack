import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_IOT_CONFIG, type IotIngestionConfig } from '../../../config/iot-ingestion.js';

import type { IngestMeasurementDto } from './dto/ingest-measurement.dto.js';
import type {
  BatchIngestResponseDto,
  IngestResponseDto,
  IngestionHealthDto,
} from './dto/ingestion-response.dto.js';
import { InMemoryIngestionQueue, type MeasurementJob } from './ingestion.queue.js';
import { IngestionRepository, type ProcessedMeasurement } from './ingestion.repository.js';

@Injectable()
export class IngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private readonly config: IotIngestionConfig;
  private isInitialized = false;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(IngestionRepository) private readonly repository: IngestionRepository,
    @Inject(InMemoryIngestionQueue) private readonly queue: InMemoryIngestionQueue,
  ) {
    this.config = this.configService.get<IotIngestionConfig>('iotIngestion') ?? DEFAULT_IOT_CONFIG;
  }

  onModuleInit() {
    if (!this.config.IOT_INGESTION_ENABLED) {
      this.logger.warn('IoT Ingestion is disabled');
      return;
    }

    this.queue.startProcessor(this.processor.bind(this), {
      concurrency: this.config.IOT_QUEUE_CONCURRENCY,
      maxBatchMeasurements: this.config.IOT_QUEUE_BATCH_SIZE,
    });
    this.isInitialized = true;
    this.logger.log('IoT Ingestion service initialized');
  }

  onModuleDestroy() {
    this.queue.stopProcessor();
    this.logger.log('IoT Ingestion service stopped');
  }

  async ingestSingle(dto: IngestMeasurementDto): Promise<IngestResponseDto> {
    if (!this.isInitialized) {
      throw new ServiceUnavailableException('IoT Ingestion is not available');
    }

    await this.checkBackpressure();

    const measurement = this.repository.transformDtoToMeasurement(dto);
    const jobId = await this.queue.enqueue([{ measurement, deviceUid: dto.deviceUid }]);

    return {
      accepted: 1,
      processing: true,
      messageId: jobId,
    };
  }

  async ingestBatch(dtos: IngestMeasurementDto[]): Promise<BatchIngestResponseDto> {
    if (!this.isInitialized) {
      throw new ServiceUnavailableException('IoT Ingestion is not available');
    }

    if (dtos.length === 0) {
      throw new BadRequestException('At least one measurement is required.');
    }

    if (dtos.length > this.config.IOT_MAX_BATCH_SIZE) {
      throw new BadRequestException(
        `Batch size exceeds maximum of ${this.config.IOT_MAX_BATCH_SIZE}.`,
      );
    }

    await this.checkBackpressure();

    const measurements: ProcessedMeasurement[] = dtos.map((dto) => ({
      measurement: this.repository.transformDtoToMeasurement(dto),
      deviceUid: dto.deviceUid,
    }));

    const batchId = await this.queue.enqueue(measurements);

    return {
      accepted: dtos.length,
      processing: true,
      batchId,
    };
  }

  async getHealth(): Promise<IngestionHealthDto> {
    if (!this.config.IOT_INGESTION_ENABLED) {
      return {
        status: 'unhealthy',
        queueEnabled: false,
        backpressureActive: false,
        pendingCount: 0,
        processedLastHour: 0,
      };
    }

    const pendingCount = await this.queue.getPendingCount();
    const backpressureActive = pendingCount >= this.config.IOT_BACKPRESSURE_THRESHOLD;

    if (backpressureActive && !this.queue.isPaused()) {
      this.queue.pause();
    } else if (!backpressureActive && this.queue.isPaused()) {
      this.queue.resume();
    }

    return {
      status: backpressureActive ? 'degraded' : 'healthy',
      queueEnabled: true,
      backpressureActive,
      pendingCount,
      processedLastHour: this.queue.getProcessedLastHour(),
    };
  }

  private async checkBackpressure(): Promise<void> {
    const pendingCount = await this.queue.getPendingCount();
    if (pendingCount >= this.config.IOT_BACKPRESSURE_THRESHOLD) {
      if (!this.queue.isPaused()) {
        this.queue.pause();
      }

      throw new ServiceUnavailableException(
        'Service temporarily unavailable due to high load. Please retry later.',
      );
    }

    if (this.queue.isPaused()) {
      this.queue.resume();
    }
  }

  private async processor(jobs: MeasurementJob[]): Promise<void> {
    const allMeasurements: ProcessedMeasurement[] = [];

    for (const job of jobs) {
      allMeasurements.push(...job.measurements);
    }

    if (allMeasurements.length === 0) {
      return;
    }

    const batchSize = this.config.IOT_QUEUE_BATCH_SIZE;

    for (let index = 0; index < allMeasurements.length; index += batchSize) {
      const batch = allMeasurements.slice(index, index + batchSize);
      const result = await this.repository.batchInsertMeasurements(batch, batchSize);

      if (result.failed > 0) {
        this.logger.warn(
          `Inserted ${result.inserted} measurements and failed ${result.failed} measurements.`,
        );
      } else {
        this.logger.debug(`Inserted ${result.inserted} measurements.`);
      }
    }
  }
}
