import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import {
  collectionDomainEvents,
  collectionDomainSnapshots,
  collectionEvents,
  containers,
  eventConnectorExports,
  type DatabaseClient,
  tourStops,
  tours,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';
import { InternalEventPolicyService } from '../events/internal-events.policy.js';

import {
  applyCollectionDomainEvent,
  createCancelledTourEvent,
  createCompletedTourEvent,
  createScheduledTourEvent,
  createStartedTourEvent,
  createUpdatedTourEvent,
  createValidatedStopEvent,
  normalizeCollectionStatus,
  readCurrentActiveStopId,
  rehydrateCollectionAggregate,
  type CollectionAggregateState,
  type CollectionCommandMetadata,
  type CollectionDomainEventRecord,
  type CreateCollectionTourCommandInput,
  type UpdateCollectionTourCommandInput,
} from './collection-domain.contracts.js';
import type { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';

type TransactionClient = Parameters<DatabaseClient['transaction']>[0] extends (
  arg: infer T,
) => unknown
  ? T
  : never;

type TourProjectionRow = {
  id: string;
  name: string;
  status: string;
  scheduledFor: Date;
  zoneId: string | null;
  assignedAgentId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

type TourStopProjectionRow = {
  id: string;
  containerId: string;
  stopOrder: number;
  status: string;
  eta: Date | null;
  completedAt: Date | null;
};

type ValidateStopContext = {
  stopId: string;
  containerId: string;
  containerCode: string;
  stopOrder: number;
  status: string;
};

type CollectionCommandResult = {
  aggregate: CollectionAggregateState;
  createdEventIds: string[];
};

const TERMINAL_TOUR_STATUSES = new Set(['completed', 'closed', 'cancelled']);
const CONNECTOR_NAME_ARCHIVE_FILES = 'archive_files';
const SOURCE_TYPE_COLLECTION_DOMAIN_EVENT = 'collection_domain_event';

@Injectable()
export class CollectionsDomainRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DatabaseClient,
    private readonly internalEventPolicy: InternalEventPolicyService,
  ) {}

  async getAggregateState(tourId: string) {
    return this.db.transaction((tx) => this.loadAggregateState(tx, tourId, true));
  }

  async createScheduledTour(
    command: CreateCollectionTourCommandInput,
    metadata: CollectionCommandMetadata,
  ) {
    return this.db.transaction(async (tx) => {
      const { event } = createScheduledTourEvent(command, metadata);
      this.internalEventPolicy.assertProducerAuthorized(event.envelope);

      const nextState = applyCollectionDomainEvent(null, event);
      await this.persistEventsAndProjection(tx, null, nextState, [event]);

      return {
        aggregate: nextState,
        createdEventIds: [event.id],
      } satisfies CollectionCommandResult;
    });
  }

  async updateTour(
    tourId: string,
    command: UpdateCollectionTourCommandInput,
    metadata: CollectionCommandMetadata,
  ) {
    return this.db.transaction(async (tx) => {
      const currentState = await this.loadAggregateState(tx, tourId, true);
      this.assertUpdatableState(currentState, command);

      const event = createUpdatedTourEvent(currentState, command, metadata);
      this.internalEventPolicy.assertProducerAuthorized(event.envelope);

      const nextState = applyCollectionDomainEvent(currentState, event);
      await this.persistEventsAndProjection(tx, currentState, nextState, [event]);

      return {
        aggregate: nextState,
        createdEventIds: [event.id],
      } satisfies CollectionCommandResult;
    });
  }

  async startTour(
    tourId: string,
    actorUserId: string,
    metadata: CollectionCommandMetadata,
  ) {
    return this.db.transaction(async (tx) => {
      const currentState = await this.loadAggregateState(tx, tourId, true);
      this.assertActorAssignment(currentState, actorUserId);

      if (this.isTerminalStatus(currentState.status)) {
        throw new BadRequestException('Completed tours cannot be restarted.');
      }

      if (currentState.status === 'in_progress') {
        return {
          aggregate: currentState,
          createdEventIds: [],
        } satisfies CollectionCommandResult;
      }

      const firstActiveStopId = readCurrentActiveStopId(currentState);
      const event = createStartedTourEvent(currentState, firstActiveStopId, metadata);
      this.internalEventPolicy.assertProducerAuthorized(event.envelope);

      const nextState = applyCollectionDomainEvent(currentState, event);
      await this.persistEventsAndProjection(tx, currentState, nextState, [event]);

      return {
        aggregate: nextState,
        createdEventIds: [event.id],
      } satisfies CollectionCommandResult;
    });
  }

  async validateStop(
    tourId: string,
    stopId: string,
    actorUserId: string,
    dto: ValidateTourStopDto,
    metadata: CollectionCommandMetadata,
  ) {
    return this.db.transaction(async (tx) => {
      const currentState = await this.loadAggregateState(tx, tourId, true);
      this.assertActorAssignment(currentState, actorUserId);

      if (this.isTerminalStatus(currentState.status)) {
        throw new BadRequestException('This tour has already been completed.');
      }

      const stopContext = await this.loadValidateStopContext(tx, tourId, stopId);
      const manualContainerId = dto.containerId;
      const qrCode = dto.qrCode?.trim();

      if (manualContainerId && manualContainerId !== stopContext.containerId) {
        throw new BadRequestException('Manual container selection does not match this stop.');
      }

      if (qrCode && qrCode !== stopContext.containerCode) {
        throw new BadRequestException('QR code mismatch. Use manual fallback selection if needed.');
      }

      if (stopContext.status === 'completed') {
        return {
          aggregate: currentState,
          createdEventIds: [],
        } satisfies CollectionCommandResult;
      }

      if (stopContext.status !== 'active') {
        throw new BadRequestException('Only the active stop can be validated.');
      }

      const nextPendingStop = currentState.stops
        .filter((stop) => stop.status === 'pending' && stop.stopOrder > stopContext.stopOrder)
        .sort((left, right) => left.stopOrder - right.stopOrder)[0];

      const validatedEvent = createValidatedStopEvent(
        currentState,
        {
          tourStopId: stopContext.stopId,
          containerId: stopContext.containerId,
          collectedAt: (metadata.occurredAt ?? new Date()).toISOString(),
          volumeLiters: dto.volumeLiters ?? null,
          notes: dto.notes ?? null,
          latitude: dto.latitude == null ? null : Number(dto.latitude),
          longitude: dto.longitude == null ? null : Number(dto.longitude),
          nextStopId: nextPendingStop?.id ?? null,
        },
        metadata,
      );
      this.internalEventPolicy.assertProducerAuthorized(validatedEvent.envelope);

      const createdEvents: CollectionDomainEventRecord[] = [validatedEvent];
      let nextState = applyCollectionDomainEvent(currentState, validatedEvent);

      if (!nextPendingStop) {
        const completedEvent = createCompletedTourEvent(nextState, metadata);
        this.internalEventPolicy.assertProducerAuthorized(completedEvent.envelope);
        createdEvents.push(completedEvent);
        nextState = applyCollectionDomainEvent(nextState, completedEvent);
      }

      await this.persistEventsAndProjection(tx, currentState, nextState, createdEvents);

      return {
        aggregate: nextState,
        createdEventIds: createdEvents.map((event) => event.id),
      } satisfies CollectionCommandResult;
    });
  }

  async cancelTour(
    tourId: string,
    actorUserId: string,
    reason: string | null,
    metadata: CollectionCommandMetadata,
  ) {
    return this.db.transaction(async (tx) => {
      const currentState = await this.loadAggregateState(tx, tourId, true);
      this.assertActorAssignment(currentState, actorUserId);

      if (this.isTerminalStatus(currentState.status)) {
        return {
          aggregate: currentState,
          createdEventIds: [],
        } satisfies CollectionCommandResult;
      }

      const event = createCancelledTourEvent(currentState, reason, metadata);
      this.internalEventPolicy.assertProducerAuthorized(event.envelope);

      const nextState = applyCollectionDomainEvent(currentState, event);
      await this.persistEventsAndProjection(tx, currentState, nextState, [event]);

      return {
        aggregate: nextState,
        createdEventIds: [event.id],
      } satisfies CollectionCommandResult;
    });
  }

  private async persistEventsAndProjection(
    tx: TransactionClient,
    previousState: CollectionAggregateState | null,
    nextState: CollectionAggregateState,
    events: CollectionDomainEventRecord[],
  ) {
    for (const event of events) {
      await tx
        .insert(collectionDomainEvents)
        .values({
          id: event.id,
          tourId: nextState.tourId,
          aggregateVersion: event.aggregateVersion,
          eventName: event.eventName,
          eventType: event.eventType,
          actorUserId: event.actorUserId,
          routingKey: event.envelope.routingKey,
          schemaVersion: event.envelope.schemaVersion,
          producerName: event.envelope.producerName,
          producerTransactionId: event.envelope.producerTransactionId ?? undefined,
          payload: event.payload,
          traceparent: event.envelope.traceparent,
          tracestate: event.envelope.tracestate,
          occurredAt: new Date(event.occurredAt),
        })
        .onConflictDoNothing({
          target: [collectionDomainEvents.tourId, collectionDomainEvents.aggregateVersion],
        });

      await tx
        .insert(eventConnectorExports)
        .values({
          connectorName: CONNECTOR_NAME_ARCHIVE_FILES,
          sourceType: SOURCE_TYPE_COLLECTION_DOMAIN_EVENT,
          sourceRecordId: event.id,
          eventName: event.eventName,
          routingKey: event.envelope.routingKey,
          schemaVersion: event.envelope.schemaVersion,
          payload: {
            sourceType: SOURCE_TYPE_COLLECTION_DOMAIN_EVENT,
            eventId: event.id,
            aggregateVersion: event.aggregateVersion,
            occurredAt: event.occurredAt,
            actorUserId: event.actorUserId,
            envelope: event.envelope,
            payload: event.payload,
          },
          traceparent: event.envelope.traceparent,
          tracestate: event.envelope.tracestate,
        })
        .onConflictDoNothing({
          target: [
            eventConnectorExports.connectorName,
            eventConnectorExports.sourceType,
            eventConnectorExports.sourceRecordId,
          ],
        });
    }

    await this.applyProjection(tx, previousState, nextState, events);
    await this.upsertSnapshot(tx, nextState);
  }

  private async applyProjection(
    tx: TransactionClient,
    previousState: CollectionAggregateState | null,
    nextState: CollectionAggregateState,
    events: CollectionDomainEventRecord[],
  ) {
    const [existingTour] = await tx
      .select({ id: tours.id })
      .from(tours)
      .where(eq(tours.id, nextState.tourId))
      .limit(1);

    if (!existingTour) {
      await tx.insert(tours).values({
        id: nextState.tourId,
        name: nextState.name,
        status: nextState.status,
        scheduledFor: new Date(nextState.scheduledFor),
        zoneId: nextState.zoneId,
        assignedAgentId: nextState.assignedAgentId,
        startedAt: nextState.startedAt ? new Date(nextState.startedAt) : null,
        completedAt: nextState.completedAt ? new Date(nextState.completedAt) : null,
      });
    } else {
      await tx
        .update(tours)
        .set({
          name: nextState.name,
          status: nextState.status,
          scheduledFor: new Date(nextState.scheduledFor),
          zoneId: nextState.zoneId,
          assignedAgentId: nextState.assignedAgentId,
          startedAt: nextState.startedAt ? new Date(nextState.startedAt) : null,
          completedAt: nextState.completedAt ? new Date(nextState.completedAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(tours.id, nextState.tourId));
    }

    const stopIdsChanged = this.didStopIdentityChange(previousState, nextState);
    if (stopIdsChanged) {
      await tx.delete(tourStops).where(eq(tourStops.tourId, nextState.tourId));
      if (nextState.stops.length > 0) {
        await tx.insert(tourStops).values(
          nextState.stops.map((stop) => ({
            id: stop.id,
            tourId: nextState.tourId,
            containerId: stop.containerId,
            stopOrder: stop.stopOrder,
            status: stop.status,
            eta: stop.eta ? new Date(stop.eta) : null,
            completedAt: stop.completedAt ? new Date(stop.completedAt) : null,
          })),
        );
      }
    } else {
      for (const stop of nextState.stops) {
        await tx
          .update(tourStops)
          .set({
            stopOrder: stop.stopOrder,
            status: stop.status,
            eta: stop.eta ? new Date(stop.eta) : null,
            completedAt: stop.completedAt ? new Date(stop.completedAt) : null,
            updatedAt: new Date(),
          })
          .where(eq(tourStops.id, stop.id));
      }
    }

    for (const event of events) {
      if (event.eventName !== 'collections.stop.validated') {
        continue;
      }

      const payload = event.payload as Parameters<
        CollectionsDomainRepository['createCollectionEventFromDomainEvent']
      >[1];
      await this.createCollectionEventFromDomainEvent(tx, payload, event.actorUserId);
    }
  }

  private async createCollectionEventFromDomainEvent(
    tx: TransactionClient,
    payload: {
      tourStopId: string;
      containerId: string;
      volumeLiters: number | null;
      notes: string | null;
      latitude: number | null;
      longitude: number | null;
      collectedAt: string;
    },
    actorUserId: string | null,
  ) {
    await tx.insert(collectionEvents).values({
      tourStopId: payload.tourStopId,
      containerId: payload.containerId,
      actorUserId,
      volumeLiters: payload.volumeLiters,
      notes: payload.notes,
      latitude: payload.latitude == null ? null : String(payload.latitude),
      longitude: payload.longitude == null ? null : String(payload.longitude),
      collectedAt: new Date(payload.collectedAt),
    });
  }

  private async upsertSnapshot(tx: TransactionClient, state: CollectionAggregateState) {
    await tx
      .insert(collectionDomainSnapshots)
      .values({
        id: randomUUID(),
        tourId: state.tourId,
        aggregateVersion: state.version,
        state,
      })
      .onConflictDoNothing({
        target: [collectionDomainSnapshots.tourId, collectionDomainSnapshots.aggregateVersion],
      });
  }

  private async loadAggregateState(
    tx: TransactionClient,
    tourId: string,
    throwWhenMissing: boolean,
  ): Promise<CollectionAggregateState> {
    const [latestSnapshotRows, domainEvents] = await Promise.all([
      tx
        .select({
          aggregateVersion: collectionDomainSnapshots.aggregateVersion,
          state: collectionDomainSnapshots.state,
        })
        .from(collectionDomainSnapshots)
        .where(eq(collectionDomainSnapshots.tourId, tourId))
        .orderBy(desc(collectionDomainSnapshots.aggregateVersion))
        .limit(1),
      tx
        .select({
          aggregateVersion: collectionDomainEvents.aggregateVersion,
          eventName: collectionDomainEvents.eventName,
          payload: collectionDomainEvents.payload,
        })
        .from(collectionDomainEvents)
        .where(eq(collectionDomainEvents.tourId, tourId))
        .orderBy(asc(collectionDomainEvents.aggregateVersion)),
    ]);
    const latestSnapshot = latestSnapshotRows[0];

    const snapshotState = (latestSnapshot?.state as CollectionAggregateState | null) ?? null;
    const replayEvents = domainEvents
      .filter((event) => event.aggregateVersion > (latestSnapshot?.aggregateVersion ?? 0))
      .map((event) => ({
        aggregateVersion: event.aggregateVersion,
        eventName: event.eventName as CollectionDomainEventRecord['eventName'],
        payload: event.payload as CollectionDomainEventRecord['payload'],
      }));

    const state = rehydrateCollectionAggregate(snapshotState, replayEvents);
    if (state) {
      return state;
    }

    const projectionState = await this.loadAggregateStateFromProjection(tx, tourId);
    if (projectionState) {
      return projectionState;
    }

    if (throwWhenMissing) {
      throw new NotFoundException('Tour not found');
    }

    throw new NotFoundException('Tour not found');
  }

  private async loadAggregateStateFromProjection(tx: TransactionClient, tourId: string) {
    const [tourRows, stops] = await Promise.all([
      tx
        .select({
          id: tours.id,
          name: tours.name,
          status: tours.status,
          scheduledFor: tours.scheduledFor,
          zoneId: tours.zoneId,
          assignedAgentId: tours.assignedAgentId,
          startedAt: tours.startedAt,
          completedAt: tours.completedAt,
        } satisfies Record<keyof TourProjectionRow, unknown>)
        .from(tours)
        .where(eq(tours.id, tourId))
        .limit(1),
      tx
        .select({
          id: tourStops.id,
          containerId: tourStops.containerId,
          stopOrder: tourStops.stopOrder,
          status: tourStops.status,
          eta: tourStops.eta,
          completedAt: tourStops.completedAt,
        } satisfies Record<keyof TourStopProjectionRow, unknown>)
        .from(tourStops)
        .where(eq(tourStops.tourId, tourId))
        .orderBy(asc(tourStops.stopOrder)),
    ]);
    const tour = tourRows[0];

    if (!tour) {
      return null;
    }

    const normalizedStatus = normalizeCollectionStatus(tour.status);
    const aggregateState: CollectionAggregateState = {
      version: 0,
      tourId: tour.id,
      name: tour.name,
      status: normalizedStatus,
      scheduledFor: tour.scheduledFor.toISOString(),
      zoneId: tour.zoneId,
      assignedAgentId: tour.assignedAgentId,
      startedAt: tour.startedAt ? tour.startedAt.toISOString() : null,
      completedAt: tour.completedAt ? tour.completedAt.toISOString() : null,
      cancelledAt: normalizedStatus === 'cancelled' ? tour.completedAt?.toISOString() ?? null : null,
      activeStopId:
        stops.find((stop) => stop.status.trim().toLowerCase() === 'active')?.id ??
        stops.find((stop) => stop.status.trim().toLowerCase() === 'pending')?.id ??
        null,
      lastCollectedAt:
        [...stops]
          .reverse()
          .find((stop) => stop.completedAt != null)
          ?.completedAt?.toISOString() ?? null,
      stops: stops.map((stop) => ({
        id: stop.id,
        containerId: stop.containerId,
        stopOrder: stop.stopOrder,
        status:
          stop.status.trim().toLowerCase() === 'completed'
            ? 'completed'
            : stop.status.trim().toLowerCase() === 'active'
              ? 'active'
              : 'pending',
        eta: stop.eta ? stop.eta.toISOString() : null,
        completedAt: stop.completedAt ? stop.completedAt.toISOString() : null,
      })),
    };

    return aggregateState;
  }

  private async loadValidateStopContext(
    tx: TransactionClient,
    tourId: string,
    stopId: string,
  ): Promise<ValidateStopContext> {
    const [stop] = await tx
      .select({
        stopId: tourStops.id,
        containerId: tourStops.containerId,
        containerCode: containers.code,
        stopOrder: tourStops.stopOrder,
        status: tourStops.status,
      })
      .from(tourStops)
      .innerJoin(containers, eq(tourStops.containerId, containers.id))
      .where(and(eq(tourStops.id, stopId), eq(tourStops.tourId, tourId)))
      .limit(1);

    if (!stop) {
      throw new NotFoundException('Tour stop not found');
    }

    return stop;
  }

  private didStopIdentityChange(
    previousState: CollectionAggregateState | null,
    nextState: CollectionAggregateState,
  ) {
    if (!previousState) {
      return true;
    }

    if (previousState.stops.length !== nextState.stops.length) {
      return true;
    }

    return previousState.stops.some((stop, index) => stop.id !== nextState.stops[index]?.id);
  }

  private assertActorAssignment(state: CollectionAggregateState, actorUserId: string) {
    if (state.assignedAgentId && state.assignedAgentId !== actorUserId) {
      throw new ForbiddenException('You are not assigned to this tour');
    }
  }

  private assertUpdatableState(
    state: CollectionAggregateState,
    command: UpdateCollectionTourCommandInput,
  ) {
    if (this.isTerminalStatus(state.status)) {
      throw new BadRequestException('Terminal tours cannot be updated.');
    }

    if (
      command.status &&
      (normalizeCollectionStatus(command.status) === 'completed' ||
        normalizeCollectionStatus(command.status) === 'cancelled')
    ) {
      throw new BadRequestException('Use the domain command flow for terminal tour transitions.');
    }

    if (command.stops && state.status !== 'planned') {
      throw new BadRequestException('Tour stops can only be replaced before the tour starts.');
    }
  }

  private isTerminalStatus(status: string | null | undefined) {
    return TERMINAL_TOUR_STATUSES.has((status ?? '').trim().toLowerCase());
  }
}
