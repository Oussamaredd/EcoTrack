import { randomUUID } from 'node:crypto';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface ValidatedDeliveryJob {
  id: string;
  consumerName: string;
  deliveryIds: string[];
  shardId: number;
  createdAt: Date;
}

@Injectable()
export class InMemoryValidatedDeliveryQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryValidatedDeliveryQueue.name);
  private readonly queue: ValidatedDeliveryJob[] = [];
  private readonly activeConsumerShards = new Set<string>();

  private pendingDeliveries = 0;
  private activeWorkers = 0;
  private stopped = true;
  private drainScheduled = false;
  private concurrency = 1;
  private maxBatchDeliveries = 100;
  private processorHandler: ((jobs: ValidatedDeliveryJob[]) => Promise<void>) | null = null;

  onModuleInit() {
    this.logger.log('Validated-delivery queue initialized');
  }

  onModuleDestroy() {
    this.stopProcessor();
    this.logger.log('Validated-delivery queue stopped');
  }

  async enqueue(consumerName: string, deliveryIds: string[], shardId = 0) {
    const job: ValidatedDeliveryJob = {
      id: randomUUID(),
      consumerName,
      deliveryIds,
      shardId,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.pendingDeliveries += deliveryIds.length;
    this.scheduleDrain();

    return job.id;
  }

  startProcessor(
    handler: (jobs: ValidatedDeliveryJob[]) => Promise<void>,
    options?: { concurrency?: number; maxBatchDeliveries?: number },
  ) {
    this.processorHandler = handler;
    this.stopped = false;
    this.concurrency = Math.max(1, Math.trunc(options?.concurrency ?? 1));
    this.maxBatchDeliveries = Math.max(1, Math.trunc(options?.maxBatchDeliveries ?? 100));
    this.logger.log('Validated-delivery queue processor started');
    this.scheduleDrain();
  }

  stopProcessor() {
    this.stopped = true;
    this.activeWorkers = 0;
    this.drainScheduled = false;
    this.activeConsumerShards.clear();
    this.processorHandler = null;
    this.logger.log('Validated-delivery queue processor stopped');
  }

  private scheduleDrain() {
    if (this.drainScheduled || this.stopped) {
      return;
    }

    this.drainScheduled = true;
    setImmediate(() => {
      this.drainScheduled = false;
      void this.drainQueue();
    });
  }

  private async drainQueue() {
    while (
      !this.stopped &&
      this.processorHandler &&
      this.activeWorkers < this.concurrency &&
      this.queue.length > 0
    ) {
      const batch = this.dequeueBatch();
      if (!batch) {
        break;
      }
      this.activeWorkers += 1;
      this.activeConsumerShards.add(this.toConsumerShardKey(batch.consumerName, batch.shardId));
      void this.processBatch(batch.jobs, batch.deliveryCount, batch.consumerName, batch.shardId);
    }
  }

  private dequeueBatch():
    | { jobs: ValidatedDeliveryJob[]; deliveryCount: number; consumerName: string; shardId: number }
    | null {
    const nextJobIndex = this.queue.findIndex(
      (job) => !this.activeConsumerShards.has(this.toConsumerShardKey(job.consumerName, job.shardId)),
    );
    if (nextJobIndex < 0) {
      return null;
    }

    const firstJob = this.queue[nextJobIndex]!;
    const { consumerName, shardId } = firstJob;
    const jobs: ValidatedDeliveryJob[] = [];
    let deliveryCount = 0;
    let queueIndex = nextJobIndex;

    while (queueIndex < this.queue.length) {
      const nextJob = this.queue[queueIndex];
      if (!nextJob || nextJob.shardId !== shardId || nextJob.consumerName !== consumerName) {
        queueIndex += 1;
        continue;
      }

      const nextDeliveryCount = nextJob.deliveryIds.length;
      if (jobs.length > 0 && deliveryCount + nextDeliveryCount > this.maxBatchDeliveries) {
        break;
      }

      jobs.push(...this.queue.splice(queueIndex, 1));
      deliveryCount += nextDeliveryCount;
    }

    this.pendingDeliveries = Math.max(0, this.pendingDeliveries - deliveryCount);

    return {
      jobs,
      deliveryCount,
      consumerName,
      shardId,
    };
  }

  private async processBatch(
    jobs: ValidatedDeliveryJob[],
    deliveryCount: number,
    consumerName: string,
    shardId: number,
  ) {
    try {
      await this.processorHandler?.(jobs);
    } catch (error) {
      this.pendingDeliveries += deliveryCount;
      this.queue.unshift(...jobs);
      this.logger.error(
        `Failed to process validated-delivery batch: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      this.activeConsumerShards.delete(this.toConsumerShardKey(consumerName, shardId));
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      this.scheduleDrain();
    }
  }

  private toConsumerShardKey(consumerName: string, shardId: number) {
    return `${consumerName}:${shardId}`;
  }
}
