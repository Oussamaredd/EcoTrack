import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lte, or, sql } from 'drizzle-orm';
import { type DatabaseClient, eventConnectorExports } from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

import {
  EVENT_CONNECTOR_MAX_RETRIES,
  type ClaimedEventConnectorExport,
  type StageEventConnectorExportInput,
} from './event-connectors.contracts.js';

@Injectable()
export class EventConnectorsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async stageExport(input: StageEventConnectorExportInput) {
    const [exportRow] = await this.db
      .insert(eventConnectorExports)
      .values({
        connectorName: input.connectorName,
        sourceType: input.sourceType,
        sourceRecordId: input.sourceRecordId,
        eventName: input.eventName,
        routingKey: input.routingKey,
        schemaVersion: input.schemaVersion,
        payload: input.payload,
        traceparent: input.traceparent,
        tracestate: input.tracestate,
      })
      .onConflictDoUpdate({
        target: [
          eventConnectorExports.connectorName,
          eventConnectorExports.sourceType,
          eventConnectorExports.sourceRecordId,
        ],
        set: {
          eventName: input.eventName,
          routingKey: input.routingKey,
          schemaVersion: input.schemaVersion,
          payload: input.payload,
          traceparent: input.traceparent,
          tracestate: input.tracestate,
          processingStatus: 'pending',
          nextAttemptAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: eventConnectorExports.id,
      });

    return exportRow?.id ?? null;
  }

  async listRunnableExportIds(limit: number) {
    const rows = await this.db
      .select({ id: eventConnectorExports.id })
      .from(eventConnectorExports)
      .where(
        and(
          or(
            eq(eventConnectorExports.processingStatus, 'pending'),
            eq(eventConnectorExports.processingStatus, 'retry'),
          ),
          lte(eventConnectorExports.nextAttemptAt, new Date()),
        ),
      )
      .orderBy(asc(eventConnectorExports.createdAt))
      .limit(limit);

    return rows.map((row) => row.id);
  }

  async recoverStuckProcessing(staleThreshold: Date) {
    await this.db
      .update(eventConnectorExports)
      .set({
        processingStatus: 'retry',
        nextAttemptAt: new Date(),
        claimedByInstanceId: null,
        lastError: 'Recovered stale event-connector export lease.',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(eventConnectorExports.processingStatus, 'processing'),
          lte(eventConnectorExports.processingStartedAt, staleThreshold),
        ),
      );
  }

  async claimExportForProcessing(exportId: string, claimedByInstanceId: string) {
    const [claimed] = await this.db
      .update(eventConnectorExports)
      .set({
        processingStatus: 'processing',
        attemptCount: sql`${eventConnectorExports.attemptCount} + 1`,
        processingStartedAt: new Date(),
        claimedByInstanceId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(eventConnectorExports.id, exportId),
          or(
            eq(eventConnectorExports.processingStatus, 'pending'),
            eq(eventConnectorExports.processingStatus, 'retry'),
          ),
        ),
      )
      .returning({
        id: eventConnectorExports.id,
        connectorName: eventConnectorExports.connectorName,
        sourceType: eventConnectorExports.sourceType,
        sourceRecordId: eventConnectorExports.sourceRecordId,
        eventName: eventConnectorExports.eventName,
        routingKey: eventConnectorExports.routingKey,
        schemaVersion: eventConnectorExports.schemaVersion,
        attemptCount: eventConnectorExports.attemptCount,
        payload: eventConnectorExports.payload,
        traceparent: eventConnectorExports.traceparent,
        tracestate: eventConnectorExports.tracestate,
      });

    if (!claimed) {
      return null;
    }

    return {
      id: claimed.id,
      connectorName: claimed.connectorName,
      sourceType: claimed.sourceType,
      sourceRecordId: claimed.sourceRecordId,
      eventName: claimed.eventName,
      routingKey: claimed.routingKey,
      schemaVersion: claimed.schemaVersion,
      attemptCount: claimed.attemptCount,
      payload: (claimed.payload as Record<string, unknown> | null) ?? {},
      traceparent: claimed.traceparent,
      tracestate: claimed.tracestate,
    } satisfies ClaimedEventConnectorExport;
  }

  async markCompleted(exportId: string, outputLocation: string) {
    await this.db
      .update(eventConnectorExports)
      .set({
        processingStatus: 'completed',
        outputLocation,
        claimedByInstanceId: null,
        processedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(eventConnectorExports.id, exportId));
  }

  async markRetryOrFailed(exportId: string, attemptCount: number, errorMessage: string, nextAttemptAt: Date) {
    const failed = attemptCount >= EVENT_CONNECTOR_MAX_RETRIES;
    const now = new Date();

    await this.db
      .update(eventConnectorExports)
      .set({
        processingStatus: failed ? 'failed' : 'retry',
        nextAttemptAt,
        lastError: errorMessage,
        claimedByInstanceId: null,
        failedAt: failed ? now : null,
        updatedAt: now,
      })
      .where(eq(eventConnectorExports.id, exportId));
  }

  async getHealthStats() {
    const rows = await this.db
      .select({
        status: eventConnectorExports.processingStatus,
        value: sql<number>`count(*)`.mapWith(Number),
      })
      .from(eventConnectorExports)
      .groupBy(eventConnectorExports.processingStatus);

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row.value;
      return acc;
    }, {});
  }
}
