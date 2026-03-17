# IoT Ingestion Service

## Overview

The IoT Ingestion Service (M2.1) provides a high-throughput API for receiving sensor measurements from 2000+ IoT devices, supporting up to 500,000 messages per day.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  IoT Devices    │────▶│  HTTP Ingestion  │────▶│  In-Memory Queue│
│  (2000 sensors) │     │  (REST API)       │     │  (Batch Worker) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  PostgreSQL     │
                                                 │  (iot.measure-  │
                                                 │   ments table)  │
                                                 └─────────────────┘
```

## Features

- **High-throughput ingestion**: Accepts measurements at 350+ RPS
- **Batch processing**: Batch up to 1000 measurements per request
- **Backpressure handling**: Automatic queue pause when threshold exceeded
- **Async processing**: Returns 202 Accepted immediately
- **Auto-sensor registration**: Automatically creates sensor devices on first measurement
- **Container status updates**: Automatically updates container fill levels

## API Endpoints

### POST /api/iot/v1/measurements

Ingest a single measurement.

**Request:**
```json
{
  "deviceUid": "sensor-0001",
  "measuredAt": "2026-03-17T10:30:00Z",
  "fillLevelPercent": 75,
  "temperatureC": 22,
  "batteryPercent": 85,
  "signalStrength": -65
}
```

**Response (202 Accepted):**
```json
{
  "accepted": 1,
  "processing": true,
  "messageId": "uuid-of-job"
}
```

### POST /api/iot/v1/measurements/batch

Ingest multiple measurements in a single request.

**Request:**
```json
{
  "measurements": [
    {
      "deviceUid": "sensor-0001",
      "measuredAt": "2026-03-17T10:30:00Z",
      "fillLevelPercent": 75
    },
    {
      "deviceUid": "sensor-0002",
      "measuredAt": "2026-03-17T10:30:00Z",
      "fillLevelPercent": 60
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "accepted": 2,
  "processing": true,
  "batchId": "uuid-of-batch"
}
```

### GET /api/iot/v1/health

Check ingestion service health.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "queueEnabled": true,
  "backpressureActive": false,
  "pendingCount": 150,
  "processedLastHour": 45000
}
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `IOT_INGESTION_ENABLED` | `true` | Enable/disable the service |
| `IOT_QUEUE_CONCURRENCY` | `50` | Number of parallel workers |
| `IOT_QUEUE_BATCH_SIZE` | `500` | DB batch size |
| `IOT_BACKPRESSURE_THRESHOLD` | `100000` | Queue size to trigger backpressure |
| `IOT_MAX_BATCH_SIZE` | `1000` | Max measurements per request |

## Benchmark

Target metrics:
- Throughput: 350 RPS sustained
- Latency P95: < 200ms
- Latency P99: < 500ms
- Error rate: < 5%

Run benchmark:
```bash
k6 run infrastructure/performance/k6/iot-ingestion-benchmark.js
```

## Testing

Run unit tests:
```bash
npm run test --workspace=ecotrack-api
```

Run HTTP integration tests:
```bash
npm run test --workspace=ecotrack-api -- --grep "IngestionController"
```

## Future Enhancements

- MQTT adapter for direct sensor connectivity
- BullMQ with Redis for distributed processing
- Time-series aggregation workers
