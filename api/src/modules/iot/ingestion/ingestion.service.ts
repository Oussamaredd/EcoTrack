import { createHash, randomUUID } from 'node:crypto';

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
import { getPersistedTraceCarrier, withActiveSpan } from '../../../observability/tracing.helpers.js';
import { IOT_INGESTION_HTTP_PRODUCER } from '../../events/internal-events.catalog.js';
import {
  computeInternalEventShardId,
  normalizeInternalEventRoutingKey,
} from '../../events/internal-events.partitioning.js';
import { MonitoringService } from '../../monitoring/monitoring.service.js';
import { VALIDATED_EVENT_ROLLUP_CONSUMER } from '../validated-consumer/validated-consumer.contracts.js';
import { ValidatedConsumerService } from '../validated-consumer/validated-consumer.service.js';

import type { IngestMeasurementDto } from './dto/ingest-measurement.dto.js';
import type {
  BatchIngestResponseDto,
  IngestResponseDto,
  IngestionHealthDto,
} from './dto/ingestion-response.dto.js';
import {
  IOT_PROCESSING_RECOVERY_INTERVAL_MS,
  IOT_PROCESSING_STALE_LEASE_WINDOW_MS,
  type StagedMeasurementEventRef,
  type StagedMeasurementInput,
} from './ingestion.contracts.js';
import { IngestionProcessorService } from './ingestion.processor.js';
import { InMemoryIngestionQueue, type MeasurementJob } from './ingestion.queue.js';
import { IngestionRepository } from './ingestion.repository.js';

@Injectable()
export class IngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private readonly config: IotIngestionConfig;
  private readonly enqueuedEventIds = new Set<string>();
  private recoveryTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(IngestionRepository) private readonly repository: IngestionRepository,
    @Inject(InMemoryIngestionQueue) private readonly queue: InMemoryIngestionQueue,
    @Inject(IngestionProcessorService)
    private readonly processorService: IngestionProcessorService,
    private readonly validatedConsumerService: ValidatedConsumerService,
    private readonly monitoringService: MonitoringService,
  ) {
    this.config = this.configService.get<IotIngestionConfig>('iotIngestion') ?? DEFAULT_IOT_CONFIG;
  }

  onModuleInit() {
    if (!this.config.IOT_INGESTION_ENABLED) {
      this.logger.warn('IoT ingestion is disabled');
      return;
    }

    this.queue.startProcessor(this.processor.bind(this), {
      concurrency: this.config.IOT_QUEUE_CONCURRENCY,
      maxBatchMeasurements: this.config.IOT_QUEUE_BATCH_SIZE,
    });

    this.recoveryTimer = setInterval(() => {
      void this.schedulePendingEventRecovery();
    }, IOT_PROCESSING_RECOVERY_INTERVAL_MS);

    this.isInitialized = true;
    this.logger.log('IoT ingestion service initialized');
    void this.schedulePendingEventRecovery();
  }

  onModuleDestroy() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    this.queue.stopProcessor();
    this.enqueuedEventIds.clear();
    this.logger.log('IoT ingestion service stopped');
  }

  async ingestSingle(dto: IngestMeasurementDto): Promise<IngestResponseDto> {
    return withActiveSpan(
      'iot.ingestion.accept.single',
      async () => {
        this.ensureInitialized();
        await this.checkBackpressure();

        const producerTransactionId = randomUUID();
        const stagedMeasurement = this.toStagedMeasurement(dto, null, producerTransactionId);
        const stagingStartedAt = Date.now();
        const staged = await this.repository.stageMeasurements([stagedMeasurement]);
        this.monitoringService.recordServiceHop(
          'ingest_http_to_staging',
          'accepted',
          Date.now() - stagingStartedAt,
        );
        await this.enqueueStagedEvents(staged);

        return {
          accepted: 1,
          processing: true,
          messageId: staged[0]?.id ?? randomUUID(),
        };
      },
      {
        attributes: {
          'iot.device_uid': dto.deviceUid.trim(),
        },
      },
    );
  }

  async ingestBatch(dtos: IngestMeasurementDto[]): Promise<BatchIngestResponseDto> {
    return withActiveSpan(
      'iot.ingestion.accept.batch',
      async () => {
        this.ensureInitialized();

        if (dtos.length === 0) {
          throw new BadRequestException('At least one measurement is required.');
        }

        if (dtos.length > this.config.IOT_MAX_BATCH_SIZE) {
          throw new BadRequestException(
            `Batch size exceeds maximum of ${this.config.IOT_MAX_BATCH_SIZE}.`,
          );
        }

        await this.checkBackpressure();

        const batchId = randomUUID();
        const stagedMeasurements = dtos.map((dto) => this.toStagedMeasurement(dto, batchId, batchId));
        this.assertUniqueBatchDedupeKeys(stagedMeasurements);
        const stagingStartedAt = Date.now();
        const staged = await this.repository.stageMeasurements(stagedMeasurements);
        this.monitoringService.recordServiceHop(
          'ingest_http_to_staging',
          'accepted',
          Date.now() - stagingStartedAt,
        );

        await this.enqueueStagedEvents(staged);

        return {
          accepted: dtos.length,
          processing: true,
          batchId,
        };
      },
      {
        attributes: {
          'iot.batch_size': dtos.length,
        },
      },
    );
  }

  async getHealth(): Promise<IngestionHealthDto> {
    if (!this.config.IOT_INGESTION_ENABLED) {
      return {
        status: 'unhealthy',
        queueEnabled: false,
        backpressureActive: false,
        pendingCount: 0,
        processedLastHour: 0,
        processing: {
          retryCount: 0,
          processingCount: 0,
          failedCount: 0,
          rejectedCount: 0,
          oldestPendingAgeMs: null,
        },
        consumer: {
          retryCount: 0,
          processingCount: 0,
          failedCount: 0,
          pendingCount: 0,
          processedLastHour: 0,
          oldestPendingAgeMs: null,
        },
        rollupConsumer: {
          retryCount: 0,
          processingCount: 0,
          failedCount: 0,
          pendingCount: 0,
          processedLastHour: 0,
          oldestPendingAgeMs: null,
        },
      };
    }

    const stats = await this.repository.getHealthStats();
    const consumerStats = await this.validatedConsumerService.getHealthSnapshot();
    const rollupConsumerStats = await this.validatedConsumerService.getHealthSnapshotForConsumer(
      VALIDATED_EVENT_ROLLUP_CONSUMER,
    );
    const pendingCount = stats.pendingCount + stats.retryCount + stats.processingCount;
    const backpressureActive = pendingCount >= this.config.IOT_BACKPRESSURE_THRESHOLD;

    if (backpressureActive && !this.queue.isPaused()) {
      this.queue.pause();
    } else if (!backpressureActive && this.queue.isPaused()) {
      this.queue.resume();
    }

    return {
      status:
        backpressureActive ||
        stats.retryCount > 0 ||
        stats.failedCount > 0 ||
        consumerStats.retryCount > 0 ||
        consumerStats.failedCount > 0 ||
        rollupConsumerStats.retryCount > 0 ||
        rollupConsumerStats.failedCount > 0
          ? 'degraded'
          : 'healthy',
      queueEnabled: true,
      backpressureActive,
      pendingCount,
      processedLastHour: stats.validatedLastHour,
      processing: {
        retryCount: stats.retryCount,
        processingCount: stats.processingCount,
        failedCount: stats.failedCount,
        rejectedCount: stats.rejectedCount,
        oldestPendingAgeMs: stats.oldestPendingAgeMs,
      },
      consumer: {
        retryCount: consumerStats.retryCount,
        processingCount: consumerStats.processingCount,
        failedCount: consumerStats.failedCount,
        pendingCount: consumerStats.pendingCount,
        processedLastHour: consumerStats.completedLastHour,
        oldestPendingAgeMs: consumerStats.oldestPendingAgeMs,
      },
      rollupConsumer: {
        retryCount: rollupConsumerStats.retryCount,
        processingCount: rollupConsumerStats.processingCount,
        failedCount: rollupConsumerStats.failedCount,
        pendingCount: rollupConsumerStats.pendingCount,
        processedLastHour: rollupConsumerStats.completedLastHour,
        oldestPendingAgeMs: rollupConsumerStats.oldestPendingAgeMs,
      },
    };
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      throw new ServiceUnavailableException('IoT ingestion is not available');
    }
  }

  private async checkBackpressure(): Promise<void> {
    const stats = await this.repository.getHealthStats();
    const pendingCount = stats.pendingCount + stats.retryCount + stats.processingCount;

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

  private async enqueueStagedEvents(stagedEvents: StagedMeasurementEventRef[]) {
    const newEvents = stagedEvents
      .filter((event) => event.newlyStaged)
      .filter((event) => !this.enqueuedEventIds.has(event.id));

    if (newEvents.length === 0) {
      return;
    }

    newEvents.forEach((event) => {
      this.enqueuedEventIds.add(event.id);
    });

    try {
      for (const [shardId, eventIds] of this.groupStagedEventIdsByShard(newEvents)) {
        await this.queue.enqueue(eventIds, shardId);
      }
    } catch (error) {
      newEvents.forEach((event) => {
        this.enqueuedEventIds.delete(event.id);
      });
      throw error;
    }
  }

  async replayStagedEventRefs(
    stagedEvents: Array<Pick<StagedMeasurementEventRef, 'id' | 'routingKey' | 'shardId'>>,
  ) {
    this.ensureInitialized();

    await this.enqueueStagedEvents(
      stagedEvents.map((event) => ({
        ...event,
        deviceUid: event.routingKey,
        idempotencyKey: null,
        newlyStaged: true,
      })),
    );
  }

  private async schedulePendingEventRecovery() {
    if (!this.isInitialized || this.queue.isPaused()) {
      return;
    }

    try {
      await this.repository.recoverStuckProcessing(
        new Date(Date.now() - IOT_PROCESSING_STALE_LEASE_WINDOW_MS),
      );

      const runnableEventRefs = await this.repository.listRunnableEventRefs(
        this.config.IOT_QUEUE_CONCURRENCY * this.config.IOT_QUEUE_BATCH_SIZE,
      );

      const eventRefsToQueue = runnableEventRefs.filter(
        (eventRef) => !this.enqueuedEventIds.has(eventRef.id),
      );
      if (eventRefsToQueue.length === 0) {
        return;
      }

      eventRefsToQueue.forEach((eventRef) => {
        this.enqueuedEventIds.add(eventRef.id);
      });

      try {
        for (const [shardId, eventIds] of this.groupStagedEventIdsByShard(eventRefsToQueue)) {
          await this.queue.enqueue(eventIds, shardId);
        }
      } catch (error) {
        eventRefsToQueue.forEach((eventRef) => {
          this.enqueuedEventIds.delete(eventRef.id);
        });
        this.logger.error(
          `Failed to enqueue staged ingestion events: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to recover pending ingestion events: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async processor(jobs: MeasurementJob[]): Promise<void> {
    const eventIds = jobs.flatMap((job) => job.eventIds);

    for (const eventId of eventIds) {
      try {
        await this.processorService.processStagedEvent(eventId);
      } finally {
        this.enqueuedEventIds.delete(eventId);
      }
    }
  }

  private toStagedMeasurement(
    dto: IngestMeasurementDto,
    batchId: string | null,
    producerTransactionId: string,
  ): StagedMeasurementInput {
    const receivedAt = new Date();
    const traceCarrier = getPersistedTraceCarrier();
    const normalizedDeviceUid = dto.deviceUid.trim();
    const routingKey = normalizeInternalEventRoutingKey(normalizedDeviceUid);
    const normalizedMeasurementQuality = dto.measurementQuality?.trim().toLowerCase() ?? 'valid';
    const measuredAt = new Date(dto.measuredAt);
    const normalizedIdempotencyKey =
      dto.idempotencyKey?.trim() ||
      this.deriveIdempotencyKey({
        sensorDeviceId: dto.sensorDeviceId ?? null,
        containerId: dto.containerId ?? null,
        deviceUid: normalizedDeviceUid,
        measuredAt,
        fillLevelPercent: dto.fillLevelPercent,
        temperatureC: dto.temperatureC ?? null,
        batteryPercent: dto.batteryPercent ?? null,
        signalStrength: dto.signalStrength ?? null,
        measurementQuality: normalizedMeasurementQuality,
      });

    return {
      batchId,
      sensorDeviceId: dto.sensorDeviceId ?? null,
      containerId: dto.containerId ?? null,
      deviceUid: normalizedDeviceUid,
      routingKey,
      shardId: computeInternalEventShardId(routingKey, this.config.IOT_INGESTION_SHARD_COUNT),
      measuredAt,
      fillLevelPercent: dto.fillLevelPercent,
      temperatureC: dto.temperatureC ?? null,
      batteryPercent: dto.batteryPercent ?? null,
      signalStrength: dto.signalStrength ?? null,
      measurementQuality: normalizedMeasurementQuality,
      idempotencyKey: normalizedIdempotencyKey,
      producerName: IOT_INGESTION_HTTP_PRODUCER,
      producerTransactionId,
      traceparent: traceCarrier.traceparent,
      tracestate: traceCarrier.tracestate,
      receivedAt,
      rawPayload: {
        source: 'iot-ingestion-api',
        schemaVersion: 'v1',
        batchId,
        producer: {
          name: IOT_INGESTION_HTTP_PRODUCER,
          transactionId: producerTransactionId,
        },
        measurement: {
          sensorDeviceId: dto.sensorDeviceId ?? null,
          containerId: dto.containerId ?? null,
          deviceUid: normalizedDeviceUid,
          measuredAt: dto.measuredAt,
          fillLevelPercent: dto.fillLevelPercent,
          temperatureC: dto.temperatureC ?? null,
          batteryPercent: dto.batteryPercent ?? null,
          signalStrength: dto.signalStrength ?? null,
          measurementQuality: normalizedMeasurementQuality,
          idempotencyKey: normalizedIdempotencyKey,
        },
      },
    };
  }

  private assertUniqueBatchDedupeKeys(stagedMeasurements: StagedMeasurementInput[]) {
    const seenKeys = new Set<string>();

    for (const measurement of stagedMeasurements) {
      const dedupeKey = `${measurement.deviceUid}::${measurement.idempotencyKey ?? ''}`;
      if (seenKeys.has(dedupeKey)) {
        throw new BadRequestException(
          `Batch contains duplicate measurement identity for device ${measurement.deviceUid}.`,
        );
      }

      seenKeys.add(dedupeKey);
    }
  }

  private deriveIdempotencyKey(
    measurement: Pick<
      StagedMeasurementInput,
      | 'sensorDeviceId'
      | 'containerId'
      | 'deviceUid'
      | 'measuredAt'
      | 'fillLevelPercent'
      | 'temperatureC'
      | 'batteryPercent'
      | 'signalStrength'
      | 'measurementQuality'
    >,
  ) {
    const canonicalPayload = JSON.stringify({
      sensorDeviceId: measurement.sensorDeviceId,
      containerId: measurement.containerId,
      deviceUid: measurement.deviceUid,
      measuredAt: measurement.measuredAt.toISOString(),
      fillLevelPercent: measurement.fillLevelPercent,
      temperatureC: measurement.temperatureC,
      batteryPercent: measurement.batteryPercent,
      signalStrength: measurement.signalStrength,
      measurementQuality: measurement.measurementQuality,
    });

    return `derived:${createHash('sha256').update(canonicalPayload).digest('hex')}`;
  }

  private groupStagedEventIdsByShard(
    stagedEvents: Array<Pick<StagedMeasurementEventRef, 'id' | 'shardId'>>,
  ): Array<[number, string[]]> {
    const grouped = new Map<number, string[]>();

    for (const stagedEvent of stagedEvents) {
      const eventIds = grouped.get(stagedEvent.shardId) ?? [];
      eventIds.push(stagedEvent.id);
      grouped.set(stagedEvent.shardId, eventIds);
    }

    return [...grouped.entries()].sort(([left], [right]) => left - right);
  }
}
