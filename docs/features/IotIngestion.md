# IoT Ingestion Service

## Overview

The IoT ingestion service delivers workbook task `M2.1` inside the modular monolith. It exposes async HTTP ingestion endpoints for high-volume sensor measurements, buffers accepted work in memory, and persists measurements through the standard `controller -> service -> repository -> database` flow.

This implementation is optimized for the current Development scope:

- HTTP ingestion is live for sensor payloads.
- Queue workers drain measurements concurrently.
- Backpressure protects the API during sustained spikes.
- Sensor devices are auto-registered on first contact.
- Container fill state is refreshed when the measurement can be mapped to a container.

Direct MQTT transport remains a future extension. The current delivery focuses on the bounded monolith worker and the benchmark harness required by the workbook.

## Request Flow

1. `POST /api/iot/v1/measurements` or `POST /api/iot/v1/measurements/batch` validates the payload and returns `202 Accepted`.
2. The ingestion service writes the measurement payload into the in-memory queue.
3. Queue workers drain measurements concurrently according to `IOT_QUEUE_CONCURRENCY`.
4. The repository resolves or creates `sensor_devices`, writes `iot.measurements`, and updates the linked container fill state when a container mapping exists.
5. `GET /api/iot/v1/health` reports queue depth, processed count, and backpressure status.

## Validation Contract

Each measurement requires:

- `deviceUid`
- `measuredAt`
- `fillLevelPercent`

Optional telemetry fields:

- `sensorDeviceId`
- `containerId`
- `temperatureC`
- `batteryPercent`
- `signalStrength`
- `measurementQuality`
- `idempotencyKey`

Batch ingestion requires a non-empty `measurements` array and the service rejects batches larger than `IOT_MAX_BATCH_SIZE`.

## Concurrency Model

- The queue tracks pending measurements, not only pending jobs, so health and backpressure reflect the real buffered load.
- Queue workers run concurrently and drain measurement batches up to `IOT_QUEUE_BATCH_SIZE`.
- Each worker writes measurements asynchronously and records processed counts for the rolling last-hour health metric.
- When queued measurements reach `IOT_BACKPRESSURE_THRESHOLD`, the queue is paused and the API returns `503` until the backlog drops.

## API Endpoints

### `POST /api/iot/v1/measurements`

Accepts one validated measurement and returns:

```json
{
  "accepted": 1,
  "processing": true,
  "messageId": "uuid-of-job"
}
```

### `POST /api/iot/v1/measurements/batch`

Accepts a non-empty validated batch and returns:

```json
{
  "accepted": 2,
  "processing": true,
  "batchId": "uuid-of-batch"
}
```

### `GET /api/iot/v1/health`

Returns:

```json
{
  "status": "healthy",
  "queueEnabled": true,
  "backpressureActive": false,
  "pendingCount": 150,
  "processedLastHour": 45000
}
```

If ingestion is disabled, the endpoint reports `status: "unhealthy"` and `queueEnabled: false`.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `IOT_INGESTION_ENABLED` | `true` | Enables the HTTP ingestion endpoints and worker |
| `IOT_QUEUE_CONCURRENCY` | `50` | Concurrent queue workers |
| `IOT_QUEUE_BATCH_SIZE` | `500` | Max measurements drained per worker batch and DB chunk |
| `IOT_BACKPRESSURE_THRESHOLD` | `100000` | Queued-measurement threshold that activates backpressure |
| `IOT_MAX_BATCH_SIZE` | `1000` | Max measurements allowed in one batch request |

## Benchmark

The benchmark harness for workbook proof lives at:

```bash
infrastructure/performance/k6/iot-ingestion-benchmark.js
```

Run it with:

```bash
k6 run infrastructure/performance/k6/iot-ingestion-benchmark.js
```

Optional runtime override:

```bash
API_BASE_URL=http://127.0.0.1:3001 k6 run infrastructure/performance/k6/iot-ingestion-benchmark.js
```

The benchmark asserts:

- error rate under 5%
- `p(95)` request duration under 200 ms
- `p(99)` request duration under 500 ms

## Verification

- `npm run lint --workspace=ecotrack-api`
- `npm run typecheck --workspace=ecotrack-api`
- `npm run test --workspace=ecotrack-api`

## Future Extensions

- MQTT transport adapter
- Redis-backed distributed queue
- time-series aggregation and rollup workers
