export type InternalEventSchemaVersion = 'v1';

export type InternalEventEnvelope = {
  eventName: string;
  routingKey: string;
  schemaVersion: InternalEventSchemaVersion;
  producerName: string;
  producerTransactionId: string | null;
  traceparent: string | null;
  tracestate: string | null;
};
