import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, or, type SQL, sql } from 'drizzle-orm';
import { ingestionEvents, type DatabaseClient, validatedEventDeliveries } from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

type StagedReplayFilters = {
  status?: 'failed' | 'retry' | 'rejected';
  deviceUid?: string;
  batchId?: string;
  includeRejected?: boolean;
  limit?: number;
};

type DeliveryReplayFilters = {
  status?: 'failed' | 'retry';
  consumerName?: string;
  validatedEventId?: string;
  limit?: number;
};

@Injectable()
export class AdminEventWorkflowRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async listReplayableStagedEvents(filters: StagedReplayFilters = {}) {
    const where = this.buildReplayableStagedWhere(filters);
    const limit = Math.max(1, Math.min(filters.limit ?? 50, 100));

    return this.db
      .select({
        id: ingestionEvents.id,
        batchId: ingestionEvents.batchId,
        deviceUid: ingestionEvents.deviceUid,
        routingKey: ingestionEvents.routingKey,
        shardId: ingestionEvents.shardId,
        processingStatus: ingestionEvents.processingStatus,
        attemptCount: ingestionEvents.attemptCount,
        lastError: ingestionEvents.lastError,
        replayCount: ingestionEvents.replayCount,
        lastReplayedAt: ingestionEvents.lastReplayedAt,
        measuredAt: ingestionEvents.measuredAt,
        receivedAt: ingestionEvents.receivedAt,
      })
      .from(ingestionEvents)
      .where(where)
      .orderBy(asc(ingestionEvents.receivedAt))
      .limit(limit);
  }

  async markStagedEventsForReplay(
    eventIds: string[],
    actorId: string | null,
    reason: string,
    allowRejectedReplay = false,
  ) {
    const statuses = allowRejectedReplay ? ['failed', 'retry', 'rejected'] : ['failed', 'retry'];
    const now = new Date();

    const updatedRows = await this.db
      .update(ingestionEvents)
      .set({
        processingStatus: 'pending',
        attemptCount: 0,
        nextAttemptAt: now,
        processingStartedAt: null,
        processedAt: null,
        failedAt: null,
        rejectionReason: null,
        lastError: null,
        claimedByInstanceId: null,
        replayCount: sql`${ingestionEvents.replayCount} + 1`,
        lastReplayedAt: now,
        lastReplayedByUserId: actorId,
        lastReplayReason: reason,
        updatedAt: now,
      })
      .where(
        and(
          inArray(ingestionEvents.id, eventIds),
          or(
            ...statuses.map((status) => eq(ingestionEvents.processingStatus, status)),
          ),
        ),
      )
      .returning({
        id: ingestionEvents.id,
        routingKey: ingestionEvents.routingKey,
        shardId: ingestionEvents.shardId,
      });

    if (updatedRows.length === 0) {
      throw new BadRequestException('No eligible staged ingestion events matched the replay request.');
    }

    return updatedRows;
  }

  async listReplayableDeliveries(filters: DeliveryReplayFilters = {}) {
    const conditions: SQL[] = [
      or(
        eq(validatedEventDeliveries.processingStatus, filters.status ?? 'failed'),
        ...(filters.status ? [] : [eq(validatedEventDeliveries.processingStatus, 'retry')]),
      )!,
    ];

    if (filters.consumerName) {
      conditions.push(eq(validatedEventDeliveries.consumerName, filters.consumerName.trim()));
    }

    if (filters.validatedEventId) {
      conditions.push(eq(validatedEventDeliveries.validatedEventId, filters.validatedEventId));
    }

    const limit = Math.max(1, Math.min(filters.limit ?? 50, 100));

    return this.db
      .select({
        id: validatedEventDeliveries.id,
        consumerName: validatedEventDeliveries.consumerName,
        validatedEventId: validatedEventDeliveries.validatedEventId,
        eventName: validatedEventDeliveries.eventName,
        routingKey: validatedEventDeliveries.routingKey,
        shardId: validatedEventDeliveries.shardId,
        processingStatus: validatedEventDeliveries.processingStatus,
        attemptCount: validatedEventDeliveries.attemptCount,
        lastError: validatedEventDeliveries.lastError,
        replayCount: validatedEventDeliveries.replayCount,
        lastReplayedAt: validatedEventDeliveries.lastReplayedAt,
        createdAt: validatedEventDeliveries.createdAt,
      })
      .from(validatedEventDeliveries)
      .where(and(...conditions))
      .orderBy(asc(validatedEventDeliveries.createdAt))
      .limit(limit);
  }

  async listReplayableDeliveryRefsByIds(deliveryIds: string[]) {
    if (deliveryIds.length === 0) {
      return [];
    }

    return this.db
      .select({
        id: validatedEventDeliveries.id,
        eventName: validatedEventDeliveries.eventName,
        shardId: validatedEventDeliveries.shardId,
        consumerName: validatedEventDeliveries.consumerName,
      })
      .from(validatedEventDeliveries)
      .where(
        and(
          inArray(validatedEventDeliveries.id, deliveryIds),
          or(
            eq(validatedEventDeliveries.processingStatus, 'failed'),
            eq(validatedEventDeliveries.processingStatus, 'retry'),
          ),
        ),
      )
      .orderBy(asc(validatedEventDeliveries.createdAt));
  }

  async markDeliveriesForReplay(deliveryIds: string[], actorId: string | null, reason: string) {
    const now = new Date();

    const updatedRows = await this.db
      .update(validatedEventDeliveries)
      .set({
        processingStatus: 'pending',
        attemptCount: 0,
        nextAttemptAt: now,
        processingStartedAt: null,
        processedAt: null,
        failedAt: null,
        lastError: null,
        claimedByInstanceId: null,
        replayCount: sql`${validatedEventDeliveries.replayCount} + 1`,
        lastReplayedAt: now,
        lastReplayedByUserId: actorId,
        lastReplayReason: reason,
        updatedAt: now,
      })
      .where(
        and(
          inArray(validatedEventDeliveries.id, deliveryIds),
          or(
            eq(validatedEventDeliveries.processingStatus, 'failed'),
            eq(validatedEventDeliveries.processingStatus, 'retry'),
          ),
        ),
      )
      .returning({
        id: validatedEventDeliveries.id,
        eventName: validatedEventDeliveries.eventName,
        shardId: validatedEventDeliveries.shardId,
        consumerName: validatedEventDeliveries.consumerName,
      });

    if (updatedRows.length === 0) {
      throw new BadRequestException('No eligible validated-event deliveries matched the replay request.');
    }

    return updatedRows;
  }

  private buildReplayableStagedWhere(filters: StagedReplayFilters) {
    const allowedStatuses =
      filters.status === 'rejected' || filters.includeRejected
        ? ['failed', 'retry', 'rejected']
        : filters.status
          ? [filters.status]
          : ['failed', 'retry'];

    const conditions: SQL[] = [
      or(
        ...allowedStatuses.map((status) => eq(ingestionEvents.processingStatus, status)),
      )!,
    ];

    if (filters.deviceUid?.trim()) {
      conditions.push(eq(ingestionEvents.deviceUid, filters.deviceUid.trim()));
    }

    if (filters.batchId) {
      conditions.push(eq(ingestionEvents.batchId, filters.batchId));
    }

    return and(...conditions);
  }
}
