export const EVENT_CONNECTOR_MAX_RETRIES = 3;
export const EVENT_CONNECTOR_RECOVERY_INTERVAL_MS = 1_000;
export const EVENT_CONNECTOR_STALE_LEASE_WINDOW_MS = 5 * 60 * 1000;
export const EVENT_CONNECTOR_BATCH_SIZE = 50;

export type EventConnectorExportStatus =
  | 'pending'
  | 'processing'
  | 'retry'
  | 'failed'
  | 'completed';

export type ClaimedEventConnectorExport = {
  id: string;
  connectorName: string;
  sourceType: string;
  sourceRecordId: string;
  eventName: string;
  routingKey: string;
  schemaVersion: string;
  attemptCount: number;
  payload: Record<string, unknown>;
  traceparent: string | null;
  tracestate: string | null;
};

export type StageEventConnectorExportInput = {
  connectorName: string;
  sourceType: string;
  sourceRecordId: string;
  eventName: string;
  routingKey: string;
  schemaVersion: string;
  payload: Record<string, unknown>;
  traceparent: string | null;
  tracestate: string | null;
};
