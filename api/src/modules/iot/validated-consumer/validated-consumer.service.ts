import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_IOT_CONFIG, type IotIngestionConfig } from '../../../config/iot-ingestion.js';

import {
  EVENT_ARCHIVE_CONNECTOR_CONSUMER,
  VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER,
  VALIDATED_EVENT_ROLLUP_CONSUMER,
  VALIDATED_EVENT_CONSUMER_RECOVERY_INTERVAL_MS,
  VALIDATED_EVENT_CONSUMER_STALE_LEASE_WINDOW_MS,
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
  VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER,
  type ValidatedDeliveryRef,
  type ValidatedEventConsumerHealthStats,
} from './validated-consumer.contracts.js';
import { ValidatedConsumerProcessorService } from './validated-consumer.processor.js';
import { InMemoryValidatedDeliveryQueue, type ValidatedDeliveryJob } from './validated-consumer.queue.js';
import { ValidatedConsumerRepository } from './validated-consumer.repository.js';

@Injectable()
export class ValidatedConsumerService implements OnModuleInit, OnModuleDestroy {
  private static readonly CONSUMERS = [
    VALIDATED_EVENT_TIMESERIES_CONSUMER,
    VALIDATED_EVENT_ROLLUP_CONSUMER,
    VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER,
    VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER,
    EVENT_ARCHIVE_CONNECTOR_CONSUMER,
  ] as const;
  private readonly logger = new Logger(ValidatedConsumerService.name);
  private readonly config: IotIngestionConfig;
  private readonly enqueuedDeliveryIds = new Set<string>();
  private recoveryTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly repository: ValidatedConsumerRepository,
    private readonly queue: InMemoryValidatedDeliveryQueue,
    private readonly processor: ValidatedConsumerProcessorService,
  ) {
    this.config = this.configService.get<IotIngestionConfig>('iotIngestion') ?? DEFAULT_IOT_CONFIG;
  }

  onModuleInit() {
    if (!this.config.IOT_INGESTION_ENABLED) {
      return;
    }

    this.queue.startProcessor(this.processJobs.bind(this), {
      concurrency: this.config.IOT_VALIDATED_CONSUMER_CONCURRENCY,
      maxBatchDeliveries: this.config.IOT_VALIDATED_CONSUMER_BATCH_SIZE,
    });

    this.recoveryTimer = setInterval(() => {
      void this.schedulePendingRecovery();
    }, VALIDATED_EVENT_CONSUMER_RECOVERY_INTERVAL_MS);

    this.initialized = true;
    void this.schedulePendingRecovery();
  }

  onModuleDestroy() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    this.queue.stopProcessor();
    this.enqueuedDeliveryIds.clear();
    this.initialized = false;
  }

  async enqueueValidatedDeliveryRefs(
    deliveryRefs: ValidatedDeliveryRef[],
  ) {
    if (!this.initialized || deliveryRefs.length === 0) {
      return;
    }

    const newDeliveryRefs = deliveryRefs.filter((deliveryRef) => !this.enqueuedDeliveryIds.has(deliveryRef.id));
    if (newDeliveryRefs.length === 0) {
      return;
    }

    newDeliveryRefs.forEach((deliveryRef) => {
      this.enqueuedDeliveryIds.add(deliveryRef.id);
    });

    try {
      for (const [consumerName, shardId, deliveryIds] of this.groupDeliveryIdsByConsumerAndShard(
        newDeliveryRefs,
      )) {
        await this.queue.enqueue(consumerName, deliveryIds, shardId);
      }
    } catch (error) {
      newDeliveryRefs.forEach((deliveryRef) => {
        this.enqueuedDeliveryIds.delete(deliveryRef.id);
      });
      throw error;
    }
  }

  async enqueueValidatedDeliveryIds(deliveryIds: string[]) {
    await this.enqueueValidatedDeliveryRefs(
      deliveryIds.map((deliveryId) => ({
        id: deliveryId,
        shardId: 0,
        consumerName: VALIDATED_EVENT_TIMESERIES_CONSUMER,
      })),
    );
  }

  async replayDeliveryRefs(deliveryRefs: ValidatedDeliveryRef[]) {
    await this.enqueueValidatedDeliveryRefs(deliveryRefs);
  }

  async getHealthSnapshot(): Promise<ValidatedEventConsumerHealthStats> {
    return this.repository.getHealthStats(VALIDATED_EVENT_TIMESERIES_CONSUMER);
  }

  async getHealthSnapshotForConsumer(consumerName: string): Promise<ValidatedEventConsumerHealthStats> {
    return this.repository.getHealthStats(consumerName);
  }

  private async schedulePendingRecovery() {
    if (!this.initialized) {
      return;
    }

    try {
      for (const consumerName of ValidatedConsumerService.CONSUMERS) {
        await this.repository.recoverStuckProcessing(
          consumerName,
          new Date(Date.now() - VALIDATED_EVENT_CONSUMER_STALE_LEASE_WINDOW_MS),
        );

        const runnableDeliveryRefs = await this.repository.listRunnableDeliveryRefs(
          consumerName,
          this.config.IOT_VALIDATED_CONSUMER_CONCURRENCY *
            this.config.IOT_VALIDATED_CONSUMER_BATCH_SIZE,
        );

        const deliveryRefsToQueue = runnableDeliveryRefs.filter(
          (deliveryRef) => !this.enqueuedDeliveryIds.has(deliveryRef.id),
        );
        if (deliveryRefsToQueue.length === 0) {
          continue;
        }

        deliveryRefsToQueue.forEach((deliveryRef) => {
          this.enqueuedDeliveryIds.add(deliveryRef.id);
        });

        try {
          for (const [queuedConsumerName, shardId, deliveryIds] of this.groupDeliveryIdsByConsumerAndShard(
            deliveryRefsToQueue,
          )) {
            await this.queue.enqueue(queuedConsumerName, deliveryIds, shardId);
          }
        } catch (error) {
          deliveryRefsToQueue.forEach((deliveryRef) => {
            this.enqueuedDeliveryIds.delete(deliveryRef.id);
          });
          this.logger.error(
            `Failed to enqueue validated-event deliveries: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to recover validated-event deliveries: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async processJobs(jobs: ValidatedDeliveryJob[]) {
    const deliveryRefs = jobs.flatMap((job) =>
      job.deliveryIds.map((deliveryId) => ({
        deliveryId,
        consumerName: job.consumerName,
      })),
    );

    for (const deliveryRef of deliveryRefs) {
      try {
        await this.processor.processDelivery(deliveryRef.deliveryId, deliveryRef.consumerName);
      } finally {
        this.enqueuedDeliveryIds.delete(deliveryRef.deliveryId);
      }
    }
  }

  private groupDeliveryIdsByConsumerAndShard(
    deliveryRefs: ValidatedDeliveryRef[],
  ): Array<[string, number, string[]]> {
    const grouped = new Map<string, string[]>();

    for (const deliveryRef of deliveryRefs) {
      const key = `${deliveryRef.consumerName}:${deliveryRef.shardId}`;
      const deliveryIds = grouped.get(key) ?? [];
      deliveryIds.push(deliveryRef.id);
      grouped.set(key, deliveryIds);
    }

    return [...grouped.entries()]
      .map(([key, deliveryIds]) => {
        const [consumerName, shardId] = key.split(':');
        return [consumerName!, Number(shardId), deliveryIds] as [string, number, string[]];
      })
      .sort(([leftConsumer, leftShard], [rightConsumer, rightShard]) =>
        leftConsumer === rightConsumer
          ? leftShard - rightShard
          : leftConsumer.localeCompare(rightConsumer),
      );
  }
}
