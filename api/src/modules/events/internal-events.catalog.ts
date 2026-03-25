import type { InternalEventPolicy } from './internal-events.contracts.js';

export const INTERNAL_EVENT_SCHEMA_VERSION_V1 = 'v1';
export const INTERNAL_EVENT_SCHEMA_VERSION_V1_1 = 'v1.1';

export const IOT_INGESTION_HTTP_PRODUCER = 'iot_ingestion_http';
export const IOT_INGESTION_WORKER_PRODUCER = 'iot_ingestion_worker';
export const COLLECTIONS_COMMAND_SERVICE_PRODUCER = 'collections_command_service';
export const ANALYTICS_PROJECTION_SERVICE_PRODUCER = 'analytics_projection_service';
export const IOT_MEASUREMENT_VALIDATED_EVENT = 'iot.measurement.validated';
export const COLLECTIONS_TOUR_SCHEDULED_EVENT = 'collections.tour.scheduled';
export const COLLECTIONS_TOUR_UPDATED_EVENT = 'collections.tour.updated';
export const COLLECTIONS_TOUR_STARTED_EVENT = 'collections.tour.started';
export const COLLECTIONS_STOP_VALIDATED_EVENT = 'collections.stop.validated';
export const COLLECTIONS_TOUR_COMPLETED_EVENT = 'collections.tour.completed';
export const COLLECTIONS_TOUR_CANCELLED_EVENT = 'collections.tour.cancelled';
export const ANALYTICS_ZONE_AGGREGATE_EVENT = 'analytics.zone.aggregate.10m';

export const VALIDATED_EVENT_TIMESERIES_CONSUMER = 'timeseries_projection';
export const VALIDATED_EVENT_ROLLUP_CONSUMER = 'measurement_rollup_projection';
export const VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER = 'zone_analytics_projection';
export const VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER = 'anomaly_alert_projection';
export const EVENT_ARCHIVE_CONNECTOR_CONSUMER = 'event_archive_connector';
export const IOT_MEASUREMENT_VALIDATED_CONSUMERS = [
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
  VALIDATED_EVENT_ROLLUP_CONSUMER,
  VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER,
  VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER,
  EVENT_ARCHIVE_CONNECTOR_CONSUMER,
] as const;

export const IOT_MEASUREMENT_VALIDATED_POLICY: InternalEventPolicy = {
  eventName: IOT_MEASUREMENT_VALIDATED_EVENT,
  schemaSubject: IOT_MEASUREMENT_VALIDATED_EVENT,
  schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
  routingKeyDescription: 'Per-device routing by IoT sensor device UID.',
  allowedProducers: [IOT_INGESTION_WORKER_PRODUCER],
  allowedConsumers: IOT_MEASUREMENT_VALIDATED_CONSUMERS,
  replayable: true,
  externalizationTarget: {
    topicName: 'iot.measurement.validated',
    aclHandoffOwner: 'security-platform',
  },
};

const createCollectionsPolicy = (
  eventName: InternalEventPolicy['eventName'],
  routingKeyDescription: string,
): InternalEventPolicy => ({
  eventName,
  schemaSubject: eventName,
  schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
  routingKeyDescription,
  allowedProducers: [COLLECTIONS_COMMAND_SERVICE_PRODUCER],
  allowedConsumers: [EVENT_ARCHIVE_CONNECTOR_CONSUMER],
  replayable: true,
  externalizationTarget: {
    topicName: eventName,
    aclHandoffOwner: 'dev-platform',
  },
});

export const COLLECTIONS_TOUR_SCHEDULED_POLICY = createCollectionsPolicy(
  COLLECTIONS_TOUR_SCHEDULED_EVENT,
  'Per-tour routing by EcoTrack tour identifier.',
);
export const COLLECTIONS_TOUR_UPDATED_POLICY = createCollectionsPolicy(
  COLLECTIONS_TOUR_UPDATED_EVENT,
  'Per-tour routing by EcoTrack tour identifier.',
);
export const COLLECTIONS_TOUR_STARTED_POLICY = createCollectionsPolicy(
  COLLECTIONS_TOUR_STARTED_EVENT,
  'Per-tour routing by EcoTrack tour identifier.',
);
export const COLLECTIONS_STOP_VALIDATED_POLICY = createCollectionsPolicy(
  COLLECTIONS_STOP_VALIDATED_EVENT,
  'Per-tour routing by EcoTrack tour identifier.',
);
export const COLLECTIONS_TOUR_COMPLETED_POLICY = createCollectionsPolicy(
  COLLECTIONS_TOUR_COMPLETED_EVENT,
  'Per-tour routing by EcoTrack tour identifier.',
);
export const COLLECTIONS_TOUR_CANCELLED_POLICY = createCollectionsPolicy(
  COLLECTIONS_TOUR_CANCELLED_EVENT,
  'Per-tour routing by EcoTrack tour identifier.',
);

export const ANALYTICS_ZONE_AGGREGATE_POLICY: InternalEventPolicy = {
  eventName: ANALYTICS_ZONE_AGGREGATE_EVENT,
  schemaSubject: ANALYTICS_ZONE_AGGREGATE_EVENT,
  schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
  routingKeyDescription: 'Per-zone routing by EcoTrack zone identifier.',
  allowedProducers: [ANALYTICS_PROJECTION_SERVICE_PRODUCER],
  allowedConsumers: [EVENT_ARCHIVE_CONNECTOR_CONSUMER],
  replayable: true,
  externalizationTarget: {
    topicName: ANALYTICS_ZONE_AGGREGATE_EVENT,
    aclHandoffOwner: 'dev-platform',
  },
};

export const INTERNAL_EVENT_POLICIES = [
  IOT_MEASUREMENT_VALIDATED_POLICY,
  COLLECTIONS_TOUR_SCHEDULED_POLICY,
  COLLECTIONS_TOUR_UPDATED_POLICY,
  COLLECTIONS_TOUR_STARTED_POLICY,
  COLLECTIONS_STOP_VALIDATED_POLICY,
  COLLECTIONS_TOUR_COMPLETED_POLICY,
  COLLECTIONS_TOUR_CANCELLED_POLICY,
  ANALYTICS_ZONE_AGGREGATE_POLICY,
] as const;
