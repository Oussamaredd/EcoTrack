import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_IOT_CONFIG, type IotIngestionConfig } from '../../../config/iot-ingestion.js';

import type { IngestMeasurementDto } from './dto/ingest-measurement.dto.js';
import type { IngestResponseDto, BatchIngestResponseDto, IngestionHealthDto } from './dto/ingestion-response.dto.js';
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
    this.config = {
      IOT_INGESTION_ENABLED: this.configService.get<boolean>('IOT_INGESTION_ENABLED') ?? DEFAULT_IOT_CONFIG.IOT_INGESTION_ENABLED,
      IOT_MQTT_ENABLED: this.configService.get<boolean>('IOT_MQTT_ENABLED') ?? DEFAULT_IOT_CONFIG.IOT_MQTT_ENABLED,
      IOT_MQTT_BROKER_URL: this.configService.get<string>('IOT_MQTT_BROKER_URL'),
      IOT_MQTT_USERNAME: this.configService.get<string>('IOT_MQTT_USERNAME'),
      IOT_MQTT_PASSWORD: this.configService.get<string>('IOT_MQTT_PASSWORD'),
      IOT_MQTT_TOPIC: this.configService.get<string>('IOT_MQTT_TOPIC') ?? DEFAULT_IOT_CONFIG.IOT_MQTT_TOPIC,
      IOT_QUEUE_CONCURRENCY: this.configService.get<number>('IOT_QUEUE_CONCURRENCY') ?? DEFAULT_IOT_CONFIG.IOT_QUEUE_CONCURRENCY,
      IOT_QUEUE_BATCH_SIZE: this.configService.get<number>('IOT_QUEUE_BATCH_SIZE') ?? DEFAULT_IOT_CONFIG.IOT_QUEUE_BATCH_SIZE,
      IOT_BACKPRESSURE_THRESHOLD: this.configService.get<number>('IOT_BACKPRESSURE_THRESHOLD') ?? DEFAULT_IOT_CONFIG.IOT_BACKPRESSURE_THRESHOLD,
      IOT_MAX_BATCH_SIZE: this.configService.get<number>('IOT_MAX_BATCH_SIZE') ?? DEFAULT_IOT_CONFIG.IOT_MAX_BATCH_SIZE,
      IOT_REDIS_URL: this.configService.get<string>('IOT_REDIS_URL'),
    };
  }

  async onModuleInit() {
    if (!this.config.IOT_INGESTION_ENABLED) {
      this.logger.warn('IoT Ingestion is disabled');
      return;
    }

    this.queue.startProcessor(this.processor.bind(this));
    this.isInitialized = true;
    this.logger.log('IoT Ingestion service initialized');
  }

  async onModuleDestroy() {
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

  async ingestBatch(dtts: IngestMeasurementDto[]): Promise<BatchIngestResponseDto> {
    if (!this.isInitialized) {
      throw new ServiceUnavailableException('IoT Ingestion is not available');
    }

    if (dtts.length > this.config.IOT_MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${this.config.IOT_MAX_BATCH_SIZE}`);
    }

    await this.checkBackpressure();

    const measurements: ProcessedMeasurement[] = dtts.map((dto) => ({
      measurement: this.repository.transformDtoToMeasurement(dto),
      deviceUid: dto.deviceUid,
    }));

    const batchId = await this.queue.enqueue(measurements);

    return {
      accepted: dtts.length,
      processing: true,
      batchId,
    };
  }

  async getHealth(): Promise<IngestionHealthDto> {
    const pendingCount = await this.queue.getPendingCount();
    const backpressureActive = pendingCount >= this.config.IOT_BACKPRESSURE_THRESHOLD;

    if (backpressureActive && !this.queue.isPaused()) {
      this.queue.pause();
    } else if (!backpressureActive && this.queue.isPaused()) {
      this.queue.resume();
    }

    return {
      status: backpressureActive ? 'degraded' : 'healthy',
      queueEnabled: this.config.IOT_INGESTION_ENABLED,
      backpressureActive,
      pendingCount,
      processedLastHour: (this.queue as InMemoryIngestionQueue & { getProcessedLastHour?: () => number }).getProcessedLastHour?.() ?? 0,
    };
  }

  private async checkBackpressure(): Promise<void> {
    const pendingCount = await this.queue.getPendingCount();
    if (pendingCount >= this.config.IOT_BACKPRESSURE_THRESHOLD) {
      throw new ServiceUnavailableException('Service temporarily unavailable due to high load. Please retry later.');
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

    for (let i = 0; i < allMeasurements.length; i += batchSize) {
      const batch = allMeasurements.slice(i, i + batchSize);
      const result = await this.repository.batchInsertMeasurements(batch, batchSize);

      this.logger.debug(`Inserted ${result.inserted} measurements, failed ${result.failed}`);
    }
  }
}
