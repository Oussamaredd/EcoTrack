import { Injectable } from '@nestjs/common';

import { EventConnectorsService } from '../events/event-connectors.service.js';
import { InternalEventSchemaRegistryService } from '../events/internal-event-schema-registry.service.js';
import {
  ANALYTICS_PROJECTION_SERVICE_PRODUCER,
  ANALYTICS_ZONE_AGGREGATE_EVENT,
} from '../events/internal-events.catalog.js';
import { InternalEventPolicyService } from '../events/internal-events.policy.js';
import type { ClaimedValidatedEventDelivery } from '../iot/validated-consumer/validated-consumer.contracts.js';

import { AnalyticsRepository } from './analytics.repository.js';

const TEN_MINUTES_MS = 10 * 60 * 1000;
const HIGH_FILL_THRESHOLD_PERCENT = 80;

@Injectable()
export class AnalyticsProjectionService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly schemaRegistry: InternalEventSchemaRegistryService,
    private readonly internalEventPolicy: InternalEventPolicyService,
    private readonly eventConnectors: EventConnectorsService,
  ) {}

  async projectValidatedMeasurement(delivery: ClaimedValidatedEventDelivery) {
    const zoneContext = await this.repository.resolveZoneContext(delivery.containerId);
    if (!zoneContext?.zoneId) {
      return null;
    }

    const windowStart = this.floorToTenMinuteWindow(delivery.measuredAt);
    const windowEnd = new Date(windowStart.getTime() + TEN_MINUTES_MS);
    const measurements = await this.repository.listZoneWindowMeasurements(
      zoneContext.zoneId,
      windowStart,
      windowEnd,
    );
    const samples =
      measurements.length > 0
        ? measurements
        : [
            {
              fillLevelPercent: delivery.fillLevelPercent,
              measuredAt: delivery.measuredAt,
            },
          ];

    const fillLevels = samples.map((sample) => sample.fillLevelPercent);
    const measurementsCount = samples.length;
    const averageFillLevelPercent = Math.round(
      fillLevels.reduce((total, value) => total + value, 0) / measurementsCount,
    );
    const minFillLevelPercent = Math.min(...fillLevels);
    const maxFillLevelPercent = Math.max(...fillLevels);
    const highFillCount = samples.filter(
      (sample) => sample.fillLevelPercent >= HIGH_FILL_THRESHOLD_PERCENT,
    ).length;
    const trendSlopePerHour = this.computeTrendSlopePerHour(samples, windowStart);
    const schemaVersion =
      this.schemaRegistry.getLatestSchema('analytics.zone.aggregate.10m').version;

    const aggregate = await this.repository.upsertZoneAggregate({
      zoneId: zoneContext.zoneId,
      windowStart,
      windowEnd,
      measurementsCount,
      averageFillLevelPercent,
      minFillLevelPercent,
      maxFillLevelPercent,
      highFillCount,
      trendSlopePerHour,
      schemaVersion,
      sourcePayload: {
        zoneId: zoneContext.zoneId,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        measurementsCount,
        averageFillLevelPercent,
        minFillLevelPercent,
        maxFillLevelPercent,
        highFillCount,
        trendSlopePerHour,
        schemaVersion,
      },
    });

    const envelope = {
      eventName: ANALYTICS_ZONE_AGGREGATE_EVENT,
      routingKey: zoneContext.zoneId,
      schemaVersion,
      producerName: ANALYTICS_PROJECTION_SERVICE_PRODUCER,
      producerTransactionId: delivery.validatedEventId,
      traceparent: delivery.traceparent,
      tracestate: delivery.tracestate,
    } as const;
    this.internalEventPolicy.assertProducerAuthorized(envelope);

    await this.eventConnectors.stageExport({
      connectorName: 'archive_files',
      sourceType: 'zone_aggregate_projection',
      sourceRecordId: aggregate.id,
      eventName: envelope.eventName,
      routingKey: envelope.routingKey,
      schemaVersion: envelope.schemaVersion,
      payload: {
        aggregateId: aggregate.id,
        zoneId: aggregate.zoneId,
        zoneName: zoneContext.zoneName,
        windowStart: aggregate.windowStart.toISOString(),
        windowEnd: aggregate.windowEnd.toISOString(),
        measurementsCount: aggregate.measurementsCount,
        averageFillLevelPercent: aggregate.averageFillLevelPercent,
        minFillLevelPercent: aggregate.minFillLevelPercent,
        maxFillLevelPercent: aggregate.maxFillLevelPercent,
        highFillCount: aggregate.highFillCount,
        trendSlopePerHour: aggregate.trendSlopePerHour,
        envelope,
      },
      traceparent: delivery.traceparent,
      tracestate: delivery.tracestate,
    });

    return aggregate;
  }

  private floorToTenMinuteWindow(value: Date) {
    return new Date(Math.floor(value.getTime() / TEN_MINUTES_MS) * TEN_MINUTES_MS);
  }

  private computeTrendSlopePerHour(
    samples: Array<{ fillLevelPercent: number; measuredAt: Date }>,
    windowStart: Date,
  ) {
    if (samples.length <= 1) {
      return 0;
    }

    const normalizedSamples = samples.map((sample) => ({
      x: (sample.measuredAt.getTime() - windowStart.getTime()) / (60 * 60 * 1000),
      y: sample.fillLevelPercent,
    }));
    const xMean =
      normalizedSamples.reduce((total, sample) => total + sample.x, 0) / normalizedSamples.length;
    const yMean =
      normalizedSamples.reduce((total, sample) => total + sample.y, 0) / normalizedSamples.length;
    const numerator = normalizedSamples.reduce(
      (total, sample) => total + (sample.x - xMean) * (sample.y - yMean),
      0,
    );
    const denominator = normalizedSamples.reduce(
      (total, sample) => total + (sample.x - xMean) ** 2,
      0,
    );

    if (denominator === 0) {
      return 0;
    }

    return Math.round(numerator / denominator);
  }
}
