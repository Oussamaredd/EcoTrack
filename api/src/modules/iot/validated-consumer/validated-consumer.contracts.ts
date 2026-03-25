export {
  EVENT_ARCHIVE_CONNECTOR_CONSUMER,
  VALIDATED_EVENT_ANOMALY_ALERT_CONSUMER,
  VALIDATED_EVENT_ROLLUP_CONSUMER,
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
  VALIDATED_EVENT_ZONE_ANALYTICS_CONSUMER,
} from '../../events/internal-events.catalog.js';

export const VALIDATED_EVENT_CONSUMER_MAX_RETRIES = 3;
export const VALIDATED_EVENT_CONSUMER_RECOVERY_INTERVAL_MS = 1_000;
export const VALIDATED_EVENT_CONSUMER_STALE_LEASE_WINDOW_MS = 5 * 60 * 1000;

export type ValidatedEventConsumerStatus =
  | 'pending'
  | 'processing'
  | 'retry'
  | 'failed'
  | 'completed';

export type ClaimedValidatedEventDelivery = {
  id: string;
  validatedEventId: string;
  consumerName: string;
  eventName: string;
  deviceUid: string;
  routingKey: string;
  shardId: number;
  schemaVersion: string;
  claimedByInstanceId: string | null;
  traceparent: string | null;
  tracestate: string | null;
  attemptCount: number;
  measuredAt: Date;
  sensorDeviceId: string | null;
  containerId: string | null;
  fillLevelPercent: number;
  temperatureC: number | null;
  batteryPercent: number | null;
  signalStrength: number | null;
  measurementQuality: string;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  normalizedPayload: Record<string, unknown>;
  emittedAt: Date;
};

export type ValidatedDeliveryRef = {
  id: string;
  shardId: number;
  consumerName: string;
};

export type ValidatedEventConsumerHealthStats = {
  pendingCount: number;
  retryCount: number;
  processingCount: number;
  failedCount: number;
  completedLastHour: number;
  oldestPendingAgeMs: number | null;
};
