import type { InternalEventPolicy } from './internal-events.contracts.js';

export const INTERNAL_EVENT_SCHEMA_VERSION_V1 = 'v1';
export const INTERNAL_EVENT_SCHEMA_VERSION_V1_1 = 'v1.1';

export const IOT_INGESTION_HTTP_PRODUCER = 'iot_ingestion_http';
export const IOT_INGESTION_WORKER_PRODUCER = 'iot_ingestion_worker';
export const IOT_MEASUREMENT_VALIDATED_EVENT = 'iot.measurement.validated';

export const VALIDATED_EVENT_TIMESERIES_CONSUMER = 'timeseries_projection';
export const VALIDATED_EVENT_ROLLUP_CONSUMER = 'measurement_rollup_projection';
export const IOT_MEASUREMENT_VALIDATED_CONSUMERS = [
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
  VALIDATED_EVENT_ROLLUP_CONSUMER,
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

export const INTERNAL_EVENT_POLICIES = [IOT_MEASUREMENT_VALIDATED_POLICY] as const;
