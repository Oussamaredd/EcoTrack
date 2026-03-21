import 'reflect-metadata';

import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import {
  INTERNAL_EVENT_SCHEMA_VERSION_V1,
  IOT_INGESTION_HTTP_PRODUCER,
  IOT_MEASUREMENT_VALIDATED_EVENT,
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
} from '../modules/events/internal-events.catalog.js';
import type { InternalEventEnvelope } from '../modules/events/internal-events.contracts.js';
import { InternalEventsModule } from '../modules/events/internal-events.module.js';
import { InternalEventRuntimeService } from '../modules/events/internal-events.runtime.js';

const readModuleMetadata = (key: string, target: object) =>
  Reflect.getMetadata(key, target) as unknown[] | undefined;

describe('Internal event support', () => {
  it('exposes stable event catalog constants for the monolith transport', () => {
    expect(INTERNAL_EVENT_SCHEMA_VERSION_V1).toBe('v1');
    expect(IOT_INGESTION_HTTP_PRODUCER).toBe('iot_ingestion_http');
    expect(IOT_MEASUREMENT_VALIDATED_EVENT).toBe('iot.measurement.validated');
    expect(VALIDATED_EVENT_TIMESERIES_CONSUMER).toBe('timeseries_projection');
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

    expect(providers).toEqual([InternalEventRuntimeService]);
    expect(exports).toEqual([InternalEventRuntimeService]);
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
});
