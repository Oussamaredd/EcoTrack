import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { MonitoringService } from '../monitoring/monitoring.service.js';

import {
  EVENT_CONNECTOR_BATCH_SIZE,
  EVENT_CONNECTOR_MAX_RETRIES,
  EVENT_CONNECTOR_RECOVERY_INTERVAL_MS,
  EVENT_CONNECTOR_STALE_LEASE_WINDOW_MS,
  type StageEventConnectorExportInput,
} from './event-connectors.contracts.js';
import { EventConnectorsRepository } from './event-connectors.repository.js';
import { InternalEventRuntimeService } from './internal-events.runtime.js';

const CONNECTOR_EXPORT_ROOT = join(tmpdir(), 'ecotrack', 'event-connectors');

@Injectable()
export class EventConnectorsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventConnectorsService.name);
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: EventConnectorsRepository,
    private readonly runtime: InternalEventRuntimeService,
    private readonly monitoringService: MonitoringService,
  ) {}

  onModuleInit() {
    this.recoveryTimer = setInterval(() => {
      void this.processPendingExports();
    }, EVENT_CONNECTOR_RECOVERY_INTERVAL_MS);

    void this.processPendingExports();
  }

  onModuleDestroy() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  async stageExport(input: StageEventConnectorExportInput) {
    return this.repository.stageExport(input);
  }

  async processPendingExports() {
    try {
      await this.repository.recoverStuckProcessing(
        new Date(Date.now() - EVENT_CONNECTOR_STALE_LEASE_WINDOW_MS),
      );
      const exportIds = await this.repository.listRunnableExportIds(EVENT_CONNECTOR_BATCH_SIZE);

      for (const exportId of exportIds) {
        await this.processExport(exportId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process pending event connector exports: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async processExport(exportId: string) {
    const startedAt = Date.now();
    const claimed = await this.repository.claimExportForProcessing(
      exportId,
      this.runtime.getInstanceId(),
    );

    if (!claimed) {
      return;
    }

    try {
      const outputLocation = await this.persistExportArtifact(claimed);
      await this.repository.markCompleted(claimed.id, outputLocation);
      this.monitoringService.recordServiceHop(
        'event_connector_export',
        'completed',
        Date.now() - startedAt,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown event connector export error';
      await this.repository.markRetryOrFailed(
        claimed.id,
        claimed.attemptCount,
        errorMessage,
        this.computeNextAttemptAt(claimed.attemptCount),
      );
      this.monitoringService.recordServiceHop(
        'event_connector_export',
        claimed.attemptCount >= EVENT_CONNECTOR_MAX_RETRIES ? 'failed' : 'retry',
        Date.now() - startedAt,
      );
      this.logger.error(
        `Failed to write event connector export ${claimed.id}: ${errorMessage}`,
      );
    }
  }

  private async persistExportArtifact(claimed: {
    id: string;
    connectorName: string;
    sourceType: string;
    eventName: string;
    payload: Record<string, unknown>;
  }) {
    const now = new Date();
    const dayPartition = now.toISOString().slice(0, 10);
    const exportDirectory = join(
      CONNECTOR_EXPORT_ROOT,
      claimed.connectorName,
      claimed.sourceType,
      dayPartition,
    );

    await mkdir(exportDirectory, { recursive: true });

    const exportPath = join(exportDirectory, `${claimed.id}.json`);
    await writeFile(
      exportPath,
      JSON.stringify(
        {
          id: claimed.id,
          connectorName: claimed.connectorName,
          sourceType: claimed.sourceType,
          eventName: claimed.eventName,
          exportedAt: now.toISOString(),
          payload: claimed.payload,
        },
        null,
        2,
      ),
      'utf8',
    );

    return exportPath;
  }

  private computeNextAttemptAt(attemptCount: number) {
    const retryIndex = Math.max(0, attemptCount - 1);
    const backoffMs = Math.min(30_000, 1_000 * 2 ** retryIndex);
    return new Date(Date.now() + backoffMs);
  }
}
