import { randomUUID } from 'node:crypto';

import {
  COLLECTIONS_COMMAND_SERVICE_PRODUCER,
  COLLECTIONS_STOP_VALIDATED_EVENT,
  COLLECTIONS_TOUR_CANCELLED_EVENT,
  COLLECTIONS_TOUR_COMPLETED_EVENT,
  COLLECTIONS_TOUR_SCHEDULED_EVENT,
  COLLECTIONS_TOUR_STARTED_EVENT,
  COLLECTIONS_TOUR_UPDATED_EVENT,
  INTERNAL_EVENT_SCHEMA_VERSION_V1,
} from '../events/internal-events.catalog.js';
import type { InternalEventEnvelope, InternalEventName } from '../events/internal-events.contracts.js';

export type CollectionAggregateStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export type CollectionStopState = {
  id: string;
  containerId: string;
  stopOrder: number;
  status: 'pending' | 'active' | 'completed';
  eta: string | null;
  completedAt: string | null;
};

export type CollectionAggregateState = {
  version: number;
  tourId: string;
  name: string;
  status: CollectionAggregateStatus;
  scheduledFor: string;
  zoneId: string | null;
  assignedAgentId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  activeStopId: string | null;
  lastCollectedAt: string | null;
  stops: CollectionStopState[];
};

export type CollectionTourScheduledPayload = {
  tourId: string;
  name: string;
  status: CollectionAggregateStatus;
  scheduledFor: string;
  zoneId: string | null;
  assignedAgentId: string | null;
  stops: Array<{
    id: string;
    containerId: string;
    stopOrder: number;
    eta: string | null;
  }>;
  stopCount: number;
};

export type CollectionTourUpdatedPayload = {
  tourId: string;
  name: string;
  status: CollectionAggregateStatus;
  scheduledFor: string;
  zoneId: string | null;
  assignedAgentId: string | null;
  stops: Array<{
    id: string;
    containerId: string;
    stopOrder: number;
    status: 'pending' | 'active' | 'completed';
    eta: string | null;
    completedAt: string | null;
  }>;
  updatedFields: string[];
  stopCount: number;
};

export type CollectionTourStartedPayload = {
  tourId: string;
  startedAt: string;
  firstActiveStopId: string | null;
};

export type CollectionStopValidatedPayload = {
  tourId: string;
  tourStopId: string;
  containerId: string;
  collectedAt: string;
  completedAt: string;
  volumeLiters: number | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  nextStopId: string | null;
};

export type CollectionTourCompletedPayload = {
  tourId: string;
  completedAt: string;
  completedStopCount: number;
};

export type CollectionTourCancelledPayload = {
  tourId: string;
  cancelledAt: string;
  reason: string | null;
};

export type CollectionDomainEventPayload =
  | CollectionTourScheduledPayload
  | CollectionTourUpdatedPayload
  | CollectionTourStartedPayload
  | CollectionStopValidatedPayload
  | CollectionTourCompletedPayload
  | CollectionTourCancelledPayload;

export type CollectionDomainEventRecord = {
  id: string;
  aggregateVersion: number;
  eventName: InternalEventName;
  eventType: string;
  occurredAt: string;
  payload: CollectionDomainEventPayload;
  envelope: InternalEventEnvelope;
  actorUserId: string | null;
};

export type CollectionCommandMetadata = {
  actorUserId: string | null;
  traceparent: string | null;
  tracestate: string | null;
  producerTransactionId?: string | null;
  occurredAt?: Date;
};

type CollectionEventFactoryInput<TPayload extends CollectionDomainEventPayload> = {
  aggregateVersion: number;
  eventName: CollectionDomainEventRecord['eventName'];
  payload: TPayload;
  metadata: CollectionCommandMetadata;
  routingKey?: string;
};

export type CreateCollectionTourCommandInput = {
  tourId?: string;
  name: string;
  status?: CollectionAggregateStatus;
  scheduledFor: Date;
  zoneId: string | null;
  assignedAgentId: string | null;
  stops: Array<{
    id?: string;
    containerId: string;
    eta?: Date | null;
  }>;
};

export type UpdateCollectionTourCommandInput = {
  name?: string;
  status?: CollectionAggregateStatus;
  scheduledFor?: Date;
  zoneId?: string | null;
  assignedAgentId?: string | null;
  stops?: Array<{
    id?: string;
    containerId: string;
    eta?: Date | null;
    status?: 'pending' | 'active' | 'completed';
    completedAt?: Date | null;
  }>;
};

const toEventType = (eventName: InternalEventName) => eventName.split('.').slice(-2).join('_');

const sortStops = (stops: CollectionStopState[]) =>
  [...stops].sort((left, right) => left.stopOrder - right.stopOrder);

const buildCollectionEvent = <TPayload extends CollectionDomainEventPayload>({
  aggregateVersion,
  eventName,
  payload,
  metadata,
  routingKey,
}: CollectionEventFactoryInput<TPayload>): CollectionDomainEventRecord => {
  const occurredAt = metadata.occurredAt ?? new Date();

  return {
    id: randomUUID(),
    aggregateVersion,
    eventName,
    eventType: toEventType(eventName),
    occurredAt: occurredAt.toISOString(),
    payload,
    actorUserId: metadata.actorUserId ?? null,
    envelope: {
      eventName,
      routingKey: routingKey ?? readRoutingKeyFromPayload(payload),
      schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
      producerName: COLLECTIONS_COMMAND_SERVICE_PRODUCER,
      producerTransactionId: metadata.producerTransactionId ?? randomUUID(),
      traceparent: metadata.traceparent,
      tracestate: metadata.tracestate,
    },
  };
};

const readRoutingKeyFromPayload = (payload: CollectionDomainEventPayload) =>
  typeof payload.tourId === 'string' ? payload.tourId : '';

export const normalizeCollectionStatus = (
  value: string | null | undefined,
): CollectionAggregateStatus => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'completed') {
    return 'completed';
  }

  if (normalized === 'cancelled') {
    return 'cancelled';
  }

  if (normalized === 'in_progress') {
    return 'in_progress';
  }

  return 'planned';
};

export const createCollectionStops = (
  stops: CreateCollectionTourCommandInput['stops'],
): CollectionStopState[] =>
  stops.map((stop, index) => ({
    id: stop.id ?? randomUUID(),
    containerId: stop.containerId,
    stopOrder: index + 1,
    status: 'pending',
    eta: stop.eta ? stop.eta.toISOString() : null,
    completedAt: null,
  }));

export const createScheduledTourEvent = (
  command: CreateCollectionTourCommandInput,
  metadata: CollectionCommandMetadata,
) => {
  const tourId = command.tourId ?? randomUUID();
  const stops = createCollectionStops(command.stops);
  const payload: CollectionTourScheduledPayload = {
    tourId,
    name: command.name.trim(),
    status: normalizeCollectionStatus(command.status ?? 'planned'),
    scheduledFor: command.scheduledFor.toISOString(),
    zoneId: command.zoneId ?? null,
    assignedAgentId: command.assignedAgentId ?? null,
    stops: stops.map((stop) => ({
      id: stop.id,
      containerId: stop.containerId,
      stopOrder: stop.stopOrder,
      eta: stop.eta,
    })),
    stopCount: stops.length,
  };

  return {
    event: buildCollectionEvent({
      aggregateVersion: 1,
      eventName: COLLECTIONS_TOUR_SCHEDULED_EVENT,
      payload,
      metadata,
      routingKey: tourId,
    }),
    tourId,
    stops,
  };
};

export const createUpdatedTourEvent = (
  state: CollectionAggregateState,
  command: UpdateCollectionTourCommandInput,
  metadata: CollectionCommandMetadata,
) => {
  const nextStops =
    command.stops == null
      ? state.stops
      : command.stops.map((stop, index) => ({
          id: stop.id ?? randomUUID(),
          containerId: stop.containerId,
          stopOrder: index + 1,
          status: stop.status ?? 'pending',
          eta: stop.eta ? stop.eta.toISOString() : null,
          completedAt: stop.completedAt ? stop.completedAt.toISOString() : null,
        }));
  const updatedFields = [
    command.name !== undefined ? 'name' : null,
    command.status !== undefined ? 'status' : null,
    command.scheduledFor !== undefined ? 'scheduledFor' : null,
    command.zoneId !== undefined ? 'zoneId' : null,
    command.assignedAgentId !== undefined ? 'assignedAgentId' : null,
    command.stops !== undefined ? 'stops' : null,
  ].filter((field): field is string => field !== null);

  const payload: CollectionTourUpdatedPayload = {
    tourId: state.tourId,
    name: command.name?.trim() ?? state.name,
    status: normalizeCollectionStatus(command.status ?? state.status),
    scheduledFor: command.scheduledFor?.toISOString() ?? state.scheduledFor,
    zoneId: command.zoneId === undefined ? state.zoneId : (command.zoneId ?? null),
    assignedAgentId:
      command.assignedAgentId === undefined ? state.assignedAgentId : (command.assignedAgentId ?? null),
    stops: nextStops.map((stop) => ({
      id: stop.id,
      containerId: stop.containerId,
      stopOrder: stop.stopOrder,
      status: stop.status,
      eta: stop.eta,
      completedAt: stop.completedAt,
    })),
    updatedFields,
    stopCount: nextStops.length,
  };

  return buildCollectionEvent({
    aggregateVersion: state.version + 1,
    eventName: COLLECTIONS_TOUR_UPDATED_EVENT,
    payload,
    metadata,
    routingKey: state.tourId,
  });
};

export const createStartedTourEvent = (
  state: CollectionAggregateState,
  firstActiveStopId: string | null,
  metadata: CollectionCommandMetadata,
) =>
  buildCollectionEvent({
    aggregateVersion: state.version + 1,
    eventName: COLLECTIONS_TOUR_STARTED_EVENT,
    payload: {
      tourId: state.tourId,
      startedAt: (metadata.occurredAt ?? new Date()).toISOString(),
      firstActiveStopId,
    } satisfies CollectionTourStartedPayload,
    metadata,
    routingKey: state.tourId,
  });

export const createValidatedStopEvent = (
  state: CollectionAggregateState,
  payload: Omit<CollectionStopValidatedPayload, 'tourId' | 'completedAt'>,
  metadata: CollectionCommandMetadata,
) => {
  const completedAt = (metadata.occurredAt ?? new Date()).toISOString();

  return buildCollectionEvent({
    aggregateVersion: state.version + 1,
    eventName: COLLECTIONS_STOP_VALIDATED_EVENT,
    payload: {
      ...payload,
      tourId: state.tourId,
      completedAt,
    } satisfies CollectionStopValidatedPayload,
    metadata,
    routingKey: state.tourId,
  });
};

export const createCompletedTourEvent = (
  state: CollectionAggregateState,
  metadata: CollectionCommandMetadata,
) =>
  buildCollectionEvent({
    aggregateVersion: state.version + 1,
    eventName: COLLECTIONS_TOUR_COMPLETED_EVENT,
    payload: {
      tourId: state.tourId,
      completedAt: (metadata.occurredAt ?? new Date()).toISOString(),
      completedStopCount: state.stops.filter((stop) => stop.status === 'completed').length,
    } satisfies CollectionTourCompletedPayload,
    metadata,
    routingKey: state.tourId,
  });

export const createCancelledTourEvent = (
  state: CollectionAggregateState,
  reason: string | null,
  metadata: CollectionCommandMetadata,
) =>
  buildCollectionEvent({
    aggregateVersion: state.version + 1,
    eventName: COLLECTIONS_TOUR_CANCELLED_EVENT,
    payload: {
      tourId: state.tourId,
      cancelledAt: (metadata.occurredAt ?? new Date()).toISOString(),
      reason,
    } satisfies CollectionTourCancelledPayload,
    metadata,
    routingKey: state.tourId,
  });

export const applyCollectionDomainEvent = (
  currentState: CollectionAggregateState | null,
  event: Pick<CollectionDomainEventRecord, 'aggregateVersion' | 'eventName' | 'payload'>,
): CollectionAggregateState => {
  if (event.eventName === COLLECTIONS_TOUR_SCHEDULED_EVENT) {
    const payload = event.payload as CollectionTourScheduledPayload;
    return {
      version: event.aggregateVersion,
      tourId: payload.tourId,
      name: payload.name,
      status: normalizeCollectionStatus(payload.status),
      scheduledFor: payload.scheduledFor,
      zoneId: payload.zoneId,
      assignedAgentId: payload.assignedAgentId,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      activeStopId: null,
      lastCollectedAt: null,
      stops: sortStops(
        payload.stops.map((stop) => ({
          id: stop.id,
          containerId: stop.containerId,
          stopOrder: stop.stopOrder,
          status: 'pending',
          eta: stop.eta,
          completedAt: null,
        })),
      ),
    };
  }

  if (!currentState) {
    throw new Error(`Cannot apply '${event.eventName}' without a scheduled tour state.`);
  }

  if (event.eventName === COLLECTIONS_TOUR_UPDATED_EVENT) {
    const payload = event.payload as CollectionTourUpdatedPayload;
    return {
      ...currentState,
      version: event.aggregateVersion,
      name: payload.name,
      status: normalizeCollectionStatus(payload.status),
      scheduledFor: payload.scheduledFor,
      zoneId: payload.zoneId,
      assignedAgentId: payload.assignedAgentId,
      activeStopId:
        payload.stops.find((stop) => stop.status === 'active')?.id ??
        (normalizeCollectionStatus(payload.status) === 'in_progress' ? currentState.activeStopId : null),
      stops: sortStops(
        payload.stops.map((stop) => ({
          id: stop.id,
          containerId: stop.containerId,
          stopOrder: stop.stopOrder,
          status: stop.status,
          eta: stop.eta,
          completedAt: stop.completedAt,
        })),
      ),
    };
  }

  if (event.eventName === COLLECTIONS_TOUR_STARTED_EVENT) {
    const payload = event.payload as CollectionTourStartedPayload;
    return {
      ...currentState,
      version: event.aggregateVersion,
      status: 'in_progress',
      startedAt: payload.startedAt,
      activeStopId: payload.firstActiveStopId,
      stops: sortStops(
        currentState.stops.map((stop) => ({
          ...stop,
          status:
            payload.firstActiveStopId != null && stop.id === payload.firstActiveStopId
              ? 'active'
              : stop.status,
        })),
      ),
    };
  }

  if (event.eventName === COLLECTIONS_STOP_VALIDATED_EVENT) {
    const payload = event.payload as CollectionStopValidatedPayload;
    return {
      ...currentState,
      version: event.aggregateVersion,
      activeStopId: payload.nextStopId,
      lastCollectedAt: payload.collectedAt,
      stops: sortStops(
        currentState.stops.map((stop) => {
          if (stop.id === payload.tourStopId) {
            return {
              ...stop,
              status: 'completed',
              completedAt: payload.completedAt,
            } satisfies CollectionStopState;
          }

          if (payload.nextStopId != null && stop.id === payload.nextStopId) {
            return {
              ...stop,
              status: 'active',
            } satisfies CollectionStopState;
          }

          return stop;
        }),
      ),
    };
  }

  if (event.eventName === COLLECTIONS_TOUR_COMPLETED_EVENT) {
    const payload = event.payload as CollectionTourCompletedPayload;
    return {
      ...currentState,
      version: event.aggregateVersion,
      status: 'completed',
      completedAt: payload.completedAt,
      activeStopId: null,
    };
  }

  if (event.eventName === COLLECTIONS_TOUR_CANCELLED_EVENT) {
    const payload = event.payload as CollectionTourCancelledPayload;
    return {
      ...currentState,
      version: event.aggregateVersion,
      status: 'cancelled',
      cancelledAt: payload.cancelledAt,
      activeStopId: null,
    };
  }

  return currentState;
};

export const rehydrateCollectionAggregate = (
  snapshotState: CollectionAggregateState | null,
  events: Array<Pick<CollectionDomainEventRecord, 'aggregateVersion' | 'eventName' | 'payload'>>,
) => {
  let state = snapshotState;

  for (const event of [...events].sort((left, right) => left.aggregateVersion - right.aggregateVersion)) {
    state = applyCollectionDomainEvent(state, event);
  }

  return state;
};

export const readCurrentActiveStopId = (state: CollectionAggregateState) =>
  state.stops.find((stop) => stop.status === 'active')?.id ??
  state.stops.find((stop) => stop.status === 'pending')?.id ??
  null;
