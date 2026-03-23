export type InternalEventSchemaVersion = 'v1' | 'v1.1';

export type InternalEventSchemaSubject =
  | 'iot.ingestion.request'
  | 'iot.ingestion.staged'
  | 'iot.measurement.validated'
  | 'iot.validated.delivery'
  | 'iot.measurement.rollup.10m';

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

export type InternalEventProducerName = 'iot_ingestion_http' | 'iot_ingestion_worker';

export type InternalEventConsumerName = 'timeseries_projection' | 'measurement_rollup_projection';

export type InternalEventName = 'iot.measurement.validated';

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
