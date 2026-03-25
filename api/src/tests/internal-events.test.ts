import 'reflect-metadata';

import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { InternalEventSchemaRegistryService } from '../modules/events/internal-event-schema-registry.service.js';
import {
  ANALYTICS_ZONE_AGGREGATE_EVENT,
  ANALYTICS_PROJECTION_SERVICE_PRODUCER,
  COLLECTIONS_COMMAND_SERVICE_PRODUCER,
  COLLECTIONS_STOP_VALIDATED_EVENT,
  EVENT_ARCHIVE_CONNECTOR_CONSUMER,
  INTERNAL_EVENT_SCHEMA_VERSION_V1,
  INTERNAL_EVENT_SCHEMA_VERSION_V1_1,
  INTERNAL_EVENT_POLICIES,
  IOT_INGESTION_HTTP_PRODUCER,
  IOT_MEASUREMENT_VALIDATED_EVENT,
  VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER,
  VALIDATED_EVENT_ROLLUP_CONSUMER,
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
  VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER,
} from '../modules/events/internal-events.catalog.js';
import type { InternalEventEnvelope } from '../modules/events/internal-events.contracts.js';
import { InternalEventsModule } from '../modules/events/internal-events.module.js';
import { InternalEventPolicyService } from '../modules/events/internal-events.policy.js';
import { InternalEventRuntimeService } from '../modules/events/internal-events.runtime.js';

const readModuleMetadata = (key: string, target: object) =>
  Reflect.getMetadata(key, target) as unknown[] | undefined;

describe('Internal event support', () => {
  it('exposes stable event catalog constants for the monolith transport', () => {
    expect(INTERNAL_EVENT_SCHEMA_VERSION_V1).toBe('v1');
    expect(INTERNAL_EVENT_SCHEMA_VERSION_V1_1).toBe('v1.1');
    expect(IOT_INGESTION_HTTP_PRODUCER).toBe('iot_ingestion_http');
    expect(IOT_MEASUREMENT_VALIDATED_EVENT).toBe('iot.measurement.validated');
    expect(VALIDATED_EVENT_TIMESERIES_CONSUMER).toBe('timeseries_projection');
    expect(VALIDATED_EVENT_ROLLUP_CONSUMER).toBe('measurement_rollup_projection');
    expect(COLLECTIONS_COMMAND_SERVICE_PRODUCER).toBe('collections_command_service');
    expect(ANALYTICS_PROJECTION_SERVICE_PRODUCER).toBe('analytics_projection_service');
    expect(COLLECTIONS_STOP_VALIDATED_EVENT).toBe('collections.stop.validated');
    expect(ANALYTICS_ZONE_AGGREGATE_EVENT).toBe('analytics.zone.aggregate.10m');
    expect(VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER).toBe('zone_analytics_projection');
    expect(VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER).toBe('anomaly_alert_projection');
    expect(EVENT_ARCHIVE_CONNECTOR_CONSUMER).toBe('event_archive_connector');
  });

  it('creates a stable per-process worker instance identifier', () => {
    const runtime = new InternalEventRuntimeService();

    const first = runtime.getInstanceId();
    const second = runtime.getInstanceId();

    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9._-]+:\d+:[a-f0-9]{8}$/);
  });

  it('exports the runtime service through the internal events module', () => {
    const providers = readModuleMetadata(MODULE_METADATA.PROVIDERS, InternalEventsModule);
    const exports = readModuleMetadata(MODULE_METADATA.EXPORTS, InternalEventsModule);

    expect(providers).toEqual([
      InternalEventRuntimeService,
      InternalEventSchemaRegistryService,
      InternalEventPolicyService,
    ]);
    expect(exports).toEqual([
      InternalEventRuntimeService,
      InternalEventSchemaRegistryService,
      InternalEventPolicyService,
    ]);
  });

  it('keeps the internal event envelope contract shape stable', () => {
    const envelope: InternalEventEnvelope = {
      eventName: IOT_MEASUREMENT_VALIDATED_EVENT,
      routingKey: 'sensor-001',
      schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
      producerName: IOT_INGESTION_HTTP_PRODUCER,
      producerTransactionId: '11111111-1111-4111-8111-111111111111',
      traceparent: null,
      tracestate: null,
    };

    expect(envelope).toEqual({
      eventName: 'iot.measurement.validated',
      routingKey: 'sensor-001',
      schemaVersion: 'v1',
      producerName: 'iot_ingestion_http',
      producerTransactionId: '11111111-1111-4111-8111-111111111111',
      traceparent: null,
      tracestate: null,
    });
  });

  it('publishes a typed internal event policy registry', () => {
    expect(INTERNAL_EVENT_POLICIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: IOT_MEASUREMENT_VALIDATED_EVENT,
          allowedProducers: ['iot_ingestion_worker'],
          allowedConsumers: [
            VALIDATED_EVENT_TIMESERIES_CONSUMER,
            VALIDATED_EVENT_ROLLUP_CONSUMER,
            VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER,
            VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER,
            EVENT_ARCHIVE_CONNECTOR_CONSUMER,
          ],
          replayable: true,
        }),
        expect.objectContaining({
          eventName: COLLECTIONS_STOP_VALIDATED_EVENT,
          allowedProducers: [COLLECTIONS_COMMAND_SERVICE_PRODUCER],
          allowedConsumers: [EVENT_ARCHIVE_CONNECTOR_CONSUMER],
          replayable: true,
        }),
        expect.objectContaining({
          eventName: ANALYTICS_ZONE_AGGREGATE_EVENT,
          allowedProducers: [ANALYTICS_PROJECTION_SERVICE_PRODUCER],
          allowedConsumers: [EVENT_ARCHIVE_CONNECTOR_CONSUMER],
          replayable: true,
        }),
      ]),
    );
  });

  it('blocks unauthorized internal event producers', () => {
    const policy = new InternalEventPolicyService(new InternalEventSchemaRegistryService());

    expect(() =>
      policy.assertProducerAuthorized({
        eventName: IOT_MEASUREMENT_VALIDATED_EVENT,
        routingKey: 'sensor-001',
        schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
        producerName: 'iot_ingestion_worker',
        producerTransactionId: 'tx-1',
        traceparent: null,
        tracestate: null,
      }),
    ).not.toThrow();

    expect(() =>
      policy.assertProducerAuthorized({
        eventName: IOT_MEASUREMENT_VALIDATED_EVENT,
        routingKey: 'sensor-001',
        schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
        producerName: 'unauthorized_producer' as any,
        producerTransactionId: 'tx-2',
        traceparent: null,
        tracestate: null,
      }),
    ).toThrow(/not authorized/i);
  });

  it('blocks unauthorized internal event consumers', () => {
    const policy = new InternalEventPolicyService(new InternalEventSchemaRegistryService());

    expect(() =>
      policy.assertConsumerAuthorized(IOT_MEASUREMENT_VALIDATED_EVENT, VALIDATED_EVENT_TIMESERIES_CONSUMER),
    ).not.toThrow();
    expect(() =>
      policy.assertConsumerAuthorized(COLLECTIONS_STOP_VALIDATED_EVENT, EVENT_ARCHIVE_CONNECTOR_CONSUMER),
    ).not.toThrow();

    expect(() =>
      policy.assertConsumerAuthorized(IOT_MEASUREMENT_VALIDATED_EVENT, 'unauthorized_consumer'),
    ).toThrow(/not authorized/i);
  });

  it('registers schema subjects and keeps v1.1 compatible with the current validated-event contract', () => {
    const registry = new InternalEventSchemaRegistryService();

    expect(registry.listSubjects()).toEqual([
      'analytics.zone.aggregate.10m',
      'collections.stop.validated',
      'collections.tour.cancelled',
      'collections.tour.completed',
      'collections.tour.scheduled',
      'collections.tour.started',
      'collections.tour.updated',
      'iot.ingestion.request',
      'iot.ingestion.staged',
      'iot.measurement.rollup.10m',
      'iot.measurement.validated',
      'iot.validated.delivery',
    ]);

    const latestValidatedSchema = registry.getLatestSchema('iot.measurement.validated');

    expect(latestValidatedSchema.version).toBe('v1.1');
    expect(
      registry.isCompatible(
        registry.getSchema('iot.measurement.validated', 'v1'),
        latestValidatedSchema,
        latestValidatedSchema.compatibility,
      ),
    ).toBe(true);
    expect(() =>
      registry.assertCandidateCompatible({
        subject: 'iot.measurement.validated',
        version: 'v1.1',
        compatibility: 'BACKWARD',
        description: 'compatible optional-field evolution',
        fields: [
          { name: 'sourceEventId', type: 'uuid', required: true },
          { name: 'deviceUid', type: 'string', required: true },
          { name: 'routingKey', type: 'string', required: true },
          { name: 'shardId', type: 'integer', required: true },
          { name: 'measuredAt', type: 'timestamp', required: true },
          { name: 'fillLevelPercent', type: 'integer', required: true },
          { name: 'measurementQuality', type: 'string', required: true },
          { name: 'warningThreshold', type: 'integer', required: false },
          { name: 'criticalThreshold', type: 'integer', required: false },
          { name: 'ingestionSource', type: 'string', required: false, hasDefault: true },
        ],
      }),
    ).not.toThrow();
  });
});
