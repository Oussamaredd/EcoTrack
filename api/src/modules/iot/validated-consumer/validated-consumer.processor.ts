import { Injectable } from '@nestjs/common';
import { SpanKind } from '@opentelemetry/api';
import { PinoLogger } from 'nestjs-pino';

import {
  extractContextFromTraceCarrier,
  withActiveSpan,
} from '../../../observability/tracing.helpers.js';
import { AnalyticsProjectionService } from '../../analytics/analytics-projection.service.js';
import { AnomalyAlertProjectionService } from '../../analytics/anomaly-alert-projection.service.js';
import { EventConnectorsService } from '../../events/event-connectors.service.js';
import { InternalEventPolicyService } from '../../events/internal-events.policy.js';
import { InternalEventRuntimeService } from '../../events/internal-events.runtime.js';
import { MonitoringService } from '../../monitoring/monitoring.service.js';
import { MeasurementRollupsService } from '../rollups/rollups.service.js';

import {
  EVENT_ARCHIVE_CONNECTOR_CONSUMER,
  VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER,
  VALIDATED_EVENT_CONSUMER_MAX_RETRIES,
  VALIDATED_EVENT_ROLLUP_CONSUMER,
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
  VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER,
  type ClaimedValidatedEventDelivery,
} from './validated-consumer.contracts.js';
import { ValidatedConsumerRepository } from './validated-consumer.repository.js';

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i;

const extractTraceId = (traceparent: string | null): string | null => {
  if (!traceparent) {
    return null;
  }

  const match = traceparent.match(TRACEPARENT_PATTERN);
  return match?.[1]?.toLowerCase() ?? null;
};

@Injectable()
export class ValidatedConsumerProcessorService {
  constructor(
    private readonly repository: ValidatedConsumerRepository,
    private readonly internalEventRuntime: InternalEventRuntimeService,
    private readonly internalEventPolicy: InternalEventPolicyService,
    private readonly measurementRollupsService: MeasurementRollupsService,
    private readonly analyticsProjectionService: AnalyticsProjectionService,
    private readonly anomalyAlertProjectionService: AnomalyAlertProjectionService,
    private readonly eventConnectorsService: EventConnectorsService,
    private readonly monitoringService: MonitoringService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ValidatedConsumerProcessorService.name);
  }

  async processDelivery(deliveryId: string, consumerName: string) {
    const claimStartedAt = Date.now();
    const claimedDelivery = await this.repository.claimDeliveryForProcessing(
      deliveryId,
      consumerName,
      this.internalEventRuntime.getInstanceId(),
    );
    if (!claimedDelivery) {
      this.monitoringService.recordServiceHop(
        'validated_delivery_claim',
        'skipped',
        Date.now() - claimStartedAt,
      );
      return { status: 'skipped' as const };
    }
    this.monitoringService.recordServiceHop(
      'validated_delivery_claim',
      'claimed',
      Date.now() - claimStartedAt,
    );

    const parentContext = extractContextFromTraceCarrier({
      traceparent: claimedDelivery.traceparent,
      tracestate: claimedDelivery.tracestate,
    });

    return withActiveSpan(
      'iot.validated_consumer.process',
      async () => {
        this.internalEventPolicy.assertConsumerAuthorized(
          claimedDelivery.eventName,
          claimedDelivery.consumerName,
        );
        return this.processClaimedDelivery(claimedDelivery);
      },
      {
        kind: SpanKind.CONSUMER,
        parentContext,
        attributes: {
          'iot.delivery_id': claimedDelivery.id,
          'iot.validated_event_id': claimedDelivery.validatedEventId,
          'iot.consumer_name': claimedDelivery.consumerName,
          'iot.delivery_attempt': claimedDelivery.attemptCount,
        },
      },
    );
  }

  private async processClaimedDelivery(delivery: ClaimedValidatedEventDelivery) {
    const startedAt = Date.now();
    try {
      if (delivery.consumerName === VALIDATED_EVENT_ROLLUP_CONSUMER) {
        await this.measurementRollupsService.projectValidatedEventRollup(delivery);
        this.monitoringService.recordServiceHop(
          'delivery_to_rollup_projection',
          'completed',
          Date.now() - startedAt,
        );
      } else if (delivery.consumerName === VALIDATED_EVENT_TIMESERIES_CONSUMER) {
        await this.repository.projectValidatedEvent(delivery);
        this.monitoringService.recordServiceHop(
          'delivery_to_timeseries_projection',
          'completed',
          Date.now() - startedAt,
        );
      } else if (delivery.consumerName === VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER) {
        await this.analyticsProjectionService.projectValidatedMeasurement(delivery);
        this.monitoringService.recordServiceHop(
          'delivery_to_zone_analytics_projection',
          'completed',
          Date.now() - startedAt,
        );
      } else if (delivery.consumerName === VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER) {
        await this.anomalyAlertProjectionService.projectValidatedMeasurement(delivery);
        this.monitoringService.recordServiceHop(
          'delivery_to_anomaly_alert_projection',
          'completed',
          Date.now() - startedAt,
        );
      } else if (delivery.consumerName === EVENT_ARCHIVE_CONNECTOR_CONSUMER) {
        await this.eventConnectorsService.stageExport({
          connectorName: 'archive_files',
          sourceType: 'validated_measurement_event',
          sourceRecordId: delivery.validatedEventId,
          eventName: delivery.eventName,
          routingKey: delivery.routingKey,
          schemaVersion: delivery.schemaVersion,
          payload: {
            validatedEventId: delivery.validatedEventId,
            measuredAt: delivery.measuredAt.toISOString(),
            emittedAt: delivery.emittedAt.toISOString(),
            deviceUid: delivery.deviceUid,
            containerId: delivery.containerId,
            fillLevelPercent: delivery.fillLevelPercent,
            temperatureC: delivery.temperatureC,
            batteryPercent: delivery.batteryPercent,
            signalStrength: delivery.signalStrength,
            measurementQuality: delivery.measurementQuality,
            payload: delivery.normalizedPayload,
          },
          traceparent: delivery.traceparent,
          tracestate: delivery.tracestate,
        });
        this.monitoringService.recordServiceHop(
          'delivery_to_event_archive_connector',
          'completed',
          Date.now() - startedAt,
        );
      } else {
        throw new Error(`Unsupported validated-event consumer '${delivery.consumerName}'.`);
      }
      await this.repository.markCompleted(delivery.id);
      this.logger.info(
        {
          traceId: extractTraceId(delivery.traceparent),
          deliveryId: delivery.id,
          validatedEventId: delivery.validatedEventId,
          eventName: delivery.eventName,
          routingKey: delivery.routingKey,
          shardId: delivery.shardId,
          consumerName: delivery.consumerName,
        },
        'Projected validated-event delivery',
      );
      return { status: 'completed' as const };
    } catch (error) {
      const nextAttemptAt = this.computeNextAttemptAt(delivery.attemptCount);
      const errorMessage = error instanceof Error ? error.message : 'Unknown validated-event processing error';

      await this.repository.markRetryOrFailed(
        delivery.id,
        delivery.attemptCount,
        errorMessage,
        nextAttemptAt,
      );
      this.monitoringService.recordServiceHop(
        this.resolveFailureHopName(delivery.consumerName),
        delivery.attemptCount >= VALIDATED_EVENT_CONSUMER_MAX_RETRIES ? 'failed' : 'retry',
        Date.now() - startedAt,
      );

      this.logger.error(
        {
          traceId: extractTraceId(delivery.traceparent),
          deliveryId: delivery.id,
          validatedEventId: delivery.validatedEventId,
          eventName: delivery.eventName,
          routingKey: delivery.routingKey,
          shardId: delivery.shardId,
          consumerName: delivery.consumerName,
          errorMessage,
        },
        'Failed processing validated-event delivery',
      );

      return {
        status:
          delivery.attemptCount >= VALIDATED_EVENT_CONSUMER_MAX_RETRIES
            ? ('failed' as const)
            : ('retry' as const),
      };
    }
  }

  private computeNextAttemptAt(attemptCount: number) {
    const retryIndex = Math.max(0, attemptCount - 1);
    const backoffMs = Math.min(30_000, 1_000 * 2 ** retryIndex);
    return new Date(Date.now() + backoffMs);
  }

  private resolveFailureHopName(consumerName: string) {
    if (consumerName === VALIDATED_EVENT_ROLLUP_CONSUMER) {
      return 'delivery_to_rollup_projection';
    }

    if (consumerName === VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER) {
      return 'delivery_to_zone_analytics_projection';
    }

    if (consumerName === VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER) {
      return 'delivery_to_anomaly_alert_projection';
    }

    if (consumerName === EVENT_ARCHIVE_CONNECTOR_CONSUMER) {
      return 'delivery_to_event_archive_connector';
    }

    return 'delivery_to_timeseries_projection';
  }
}
