import { randomUUID } from 'node:crypto';

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import type { ProcessedMeasurement } from './ingestion.repository.js';

export interface MeasurementJob {
  id: string;
  measurements: ProcessedMeasurement[];
  createdAt: Date;
}

export interface IngestionQueue {
  enqueue(measurements: ProcessedMeasurement[]): Promise<string>;
  getPendingCount(): Promise<number>;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  startProcessor(handler: (jobs: MeasurementJob[]) => Promise<void>): void;
  stopProcessor(): void;
}

@Injectable()
export class InMemoryIngestionQueue implements IngestionQueue, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryIngestionQueue.name);
  private readonly queue: MeasurementJob[] = [];
  private processing = false;
  private paused = false;
  private processorHandler: ((jobs: MeasurementJob[]) => Promise<void>) | null = null;
  private processInterval: ReturnType<typeof setInterval> | null = null;
  private readonly processIntervalMs = 1000;
  private processedCount = 0;
  private lastHourProcessed = 0;
  private lastHourReset = new Date();

  async onModuleInit() {
    this.startProcessorLoop();
    this.logger.log('In-memory ingestion queue initialized');
  }

  async onModuleDestroy() {
    this.stopProcessor();
    this.logger.log('In-memory ingestion queue stopped');
  }

  async enqueue(measurements: ProcessedMeasurement[]): Promise<string> {
    if (this.paused) {
      throw new Error('Queue is paused due to backpressure');
    }

    const job: MeasurementJob = {
      id: randomUUID(),
      measurements,
      createdAt: new Date(),
    };

    this.queue.push(job);
    return job.id;
  }

  async getPendingCount(): Promise<number> {
    this.resetHourlyCountIfNeeded();
    return this.queue.length;
  }

  pause(): void {
    this.paused = true;
    this.logger.warn('Queue paused due to backpressure');
  }

  resume(): void {
    this.paused = false;
    this.logger.log('Queue resumed');
  }

  isPaused(): boolean {
    return this.paused;
  }

  startProcessor(handler: (jobs: MeasurementJob[]) => Promise<void>): void {
    this.processorHandler = handler;
    this.processing = true;
    this.logger.log('Queue processor started');
  }

  stopProcessor(): void {
    this.processing = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.processorHandler = null;
    this.logger.log('Queue processor stopped');
  }

  getProcessedLastHour(): number {
    this.resetHourlyCountIfNeeded();
    return this.lastHourProcessed;
  }

  private startProcessorLoop(): void {
    this.processInterval = setInterval(async () => {
      if (!this.processing || this.paused || !this.processorHandler || this.queue.length === 0) {
        return;
      }

      const batch = this.queue.splice(0, 100);

      try {
        await this.processorHandler(batch);
        this.processedCount += batch.length;
        this.lastHourProcessed += batch.length;
      } catch (error) {
        this.logger.error(`Failed to process batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.queue.unshift(...batch);
      }
    }, this.processIntervalMs);
  }

  private resetHourlyCountIfNeeded(): void {
    const now = new Date();
    const hoursDiff = (now.getTime() - this.lastHourReset.getTime()) / (1000 * 60 * 60);
    if (hoursDiff >= 1) {
      this.lastHourProcessed = 0;
      this.lastHourReset = now;
    }
  }
}
