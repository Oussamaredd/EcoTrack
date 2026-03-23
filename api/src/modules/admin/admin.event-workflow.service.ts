import { BadRequestException, Injectable } from '@nestjs/common';

import { InternalEventPolicyService } from '../events/internal-events.policy.js';
import { IngestionService } from '../iot/ingestion/ingestion.service.js';
import { ValidatedConsumerService } from '../iot/validated-consumer/validated-consumer.service.js';

import { AdminAuditService } from './admin.audit.service.js';
import { AdminEventWorkflowRepository } from './admin.event-workflow.repository.js';
import type { ListReplayableDeliveriesDto } from './dto/list-replayable-deliveries.dto.js';
import type { ListReplayableStagedEventsDto } from './dto/list-replayable-staged-events.dto.js';
import type { ReplayDeliveriesDto } from './dto/replay-deliveries.dto.js';
import type { ReplayStagedEventsDto } from './dto/replay-staged-events.dto.js';

@Injectable()
export class AdminEventWorkflowService {
  constructor(
    private readonly repository: AdminEventWorkflowRepository,
    private readonly ingestionService: IngestionService,
    private readonly validatedConsumerService: ValidatedConsumerService,
    private readonly internalEventPolicy: InternalEventPolicyService,
    private readonly auditService: AdminAuditService,
  ) {}

  async listReplayableStagedEvents(filters: ListReplayableStagedEventsDto) {
    return this.repository.listReplayableStagedEvents(filters);
  }

  async replayStagedEvents(payload: ReplayStagedEventsDto, actorId?: string | null) {
    const refs = await this.repository.markStagedEventsForReplay(
      payload.eventIds,
      actorId ?? null,
      payload.reason.trim(),
      payload.allowRejectedReplay,
    );

    if (refs.length === 0) {
      throw new BadRequestException('No staged ingestion events were replayed.');
    }

    await this.ingestionService.replayStagedEventRefs(
      refs.map((row) => ({
        id: row.id,
        routingKey: row.routingKey,
        shardId: row.shardId,
      })),
    );

    await this.auditService.log({
      userId: actorId ?? null,
      action: 'iot_ingestion_events_replayed',
      resourceType: 'iot_ingestion_events',
      newValues: {
        reason: payload.reason.trim(),
        eventIds: refs.map((row) => row.id),
        count: refs.length,
      },
    });

    return {
      replayed: refs.length,
      eventIds: refs.map((row) => row.id),
    };
  }

  async listReplayableDeliveries(filters: ListReplayableDeliveriesDto) {
    return this.repository.listReplayableDeliveries(filters);
  }

  async replayDeliveries(payload: ReplayDeliveriesDto, actorId?: string | null) {
    const eligibleRefs = await this.repository.listReplayableDeliveryRefsByIds(payload.deliveryIds);

    if (eligibleRefs.length === 0) {
      throw new BadRequestException('No eligible validated-event deliveries matched the replay request.');
    }

    for (const ref of eligibleRefs) {
      this.internalEventPolicy.assertReplayable(ref.eventName);
    }

    const refs = await this.repository.markDeliveriesForReplay(
      payload.deliveryIds,
      actorId ?? null,
      payload.reason.trim(),
    );

    await this.validatedConsumerService.replayDeliveryRefs(
      refs.map((row) => ({
        id: row.id,
        shardId: row.shardId,
        consumerName: row.consumerName,
      })),
    );

    await this.auditService.log({
      userId: actorId ?? null,
      action: 'validated_event_deliveries_replayed',
      resourceType: 'validated_event_deliveries',
      newValues: {
        reason: payload.reason.trim(),
        deliveryIds: refs.map((row) => row.id),
        count: refs.length,
      },
    });

    return {
      replayed: refs.length,
      deliveryIds: refs.map((row) => row.id),
    };
  }
}
