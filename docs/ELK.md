# ELK Stack Integration Guide

EcoTrack uses the existing ELK stack in the `obs` compose profile for centralized structured logs.

## Services

- Elasticsearch: `http://localhost:9200`
- Logstash TCP input: `logstash:5001` inside Docker, `localhost:5001` from the host
- Kibana: `http://localhost:5601`
- Grafana Elasticsearch datasource: `Elasticsearch Logs`

## Startup

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile obs up -d elasticsearch logstash kibana
```

When Prometheus or full observability commands are started with the `obs` profile, Docker Compose now pulls in `backend` and `db` automatically so metrics scraping and API log shipping have a live target.

Enable log shipping from the API runtime with:

```env
ENABLE_LOGSTASH=true
LOGSTASH_HOST=logstash
LOGSTASH_PORT=5001
```

For host-native API runs, point `LOGSTASH_HOST` at `localhost`.

## Indexed Log Shape

The API already emits JSON logs. When log shipping is enabled, Logstash writes them into daily indices named:

```text
ecotrack-api-logs-YYYY.MM.DD
```

Important searchable fields include:

- `traceId`
- `requestId`
- `eventId`
- `validatedEventId`
- `deliveryId`
- `producerName`
- `consumerName`
- `method`
- `path`
- `status`
- `msg`
- `service`
- `environment`

The IoT worker processors now emit structured success and failure logs so replay, validation, and projection activity can be correlated with the originating trace.

## Kibana Setup

1. Open `http://localhost:5601`.
2. Create a data view for `ecotrack-api-logs-*`.
3. Use `@timestamp` as the time field.

Example queries:

```text
traceId:"35f0de5f9a8f4d8ea4d6e1c46f5b2d0a"
eventId:"11111111-1111-4111-8111-111111111111"
deliveryId:"22222222-2222-4222-8222-222222222222"
producerName:"iot_ingestion_worker"
consumerName:"timeseries_projection"
msg:"Failed processing validated-event delivery"
```

## Validation

- Elasticsearch health: `curl http://localhost:9200/_cluster/health`
- Logstash logs: `docker logs logstash`
- Kibana status: `curl http://localhost:5601/api/status`
- Example alert sink logs: `docker logs alert_webhook_sink`

## Notes

- Grafana no longer provisions a dead Loki datasource in this repo; ELK is the supported log path.
- Trace search works through `traceId`, and worker replay troubleshooting works through `eventId`, `validatedEventId`, and `deliveryId`.
