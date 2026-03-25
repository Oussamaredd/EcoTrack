export type InternalEventSchemaVersion = 'v1' | 'v1.1';

export type InternalEventSchemaSubject =
  | 'iot.ingestion.request'
  | 'iot.ingestion.staged'
  | 'iot.measurement.validated'
  | 'iot.validated.delivery'
  | 'iot.measurement.rollup.10m'
  | 'collections.tour.scheduled'
  | 'collections.tour.updated'
  | 'collections.tour.started'
  | 'collections.stop.validated'
  | 'collections.tour.completed'
  | 'collections.tour.cancelled'
  | 'analytics.zone.aggregate.10m';

export type InternalEventSchemaCompatibilityMode = 'BACKWARD' | 'FORWARD' | 'FULL';

export type InternalEventSchemaField = {
  name: string;
  type: string;
  required: boolean;
  hasDefault?: boolean;
};

export type InternalEventSchemaDefinition = {
  subject: InternalEventSchemaSubject;
  version: InternalEventSchemaVersion;
  compatibility: InternalEventSchemaCompatibilityMode;
  description: string;
  fields: readonly InternalEventSchemaField[];
};

export type InternalEventProducerName =
  | 'iot_ingestion_http'
  | 'iot_ingestion_worker'
  | 'collections_command_service'
  | 'analytics_projection_service';

export type InternalEventConsumerName =
  | 'timeseries_projection'
  | 'measurement_rollup_projection'
  | 'zone_analytics_projection'
  | 'anomaly_alert_projection'
  | 'event_archive_connector';

export type InternalEventName =
  | 'iot.measurement.validated'
  | 'collections.tour.scheduled'
  | 'collections.tour.updated'
  | 'collections.tour.started'
  | 'collections.stop.validated'
  | 'collections.tour.completed'
  | 'collections.tour.cancelled'
  | 'analytics.zone.aggregate.10m';

export type InternalEventExternalizationTarget = {
  topicName: string;
  aclHandoffOwner: 'dev-platform' | 'security-platform';
};

export type InternalEventPolicy = {
  eventName: InternalEventName;
  schemaSubject: InternalEventSchemaSubject;
  schemaVersion: InternalEventSchemaVersion;
  routingKeyDescription: string;
  allowedProducers: readonly InternalEventProducerName[];
  allowedConsumers: readonly InternalEventConsumerName[];
  replayable: boolean;
  externalizationTarget: InternalEventExternalizationTarget;
};

export type InternalEventEnvelope = {
  eventName: InternalEventName;
  routingKey: string;
  schemaVersion: InternalEventSchemaVersion;
  producerName: InternalEventProducerName;
  producerTransactionId: string | null;
  traceparent: string | null;
  tracestate: string | null;
};
