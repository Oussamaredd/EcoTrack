import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { InMemoryIngestionQueue } from '../modules/iot/ingestion/ingestion.queue.js';
import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';
import { IngestionService } from '../modules/iot/ingestion/ingestion.service.js';

vi.mock('../config/iot-ingestion.js', () => ({
  DEFAULT_IOT_CONFIG: {
    IOT_INGESTION_ENABLED: true,
    IOT_MQTT_ENABLED: false,
    IOT_MQTT_TOPIC: 'ecotrack/measurements',
    IOT_QUEUE_CONCURRENCY: 50,
    IOT_QUEUE_BATCH_SIZE: 500,
    IOT_BACKPRESSURE_THRESHOLD: 100000,
    IOT_MAX_BATCH_SIZE: 1000,
  },
}));

describe('IngestionService', () => {
  let service: IngestionService;
  let mockRepository: IngestionRepository;
  let mockQueue: InMemoryIngestionQueue;

  beforeEach(() => {
    mockRepository = {
      transformDtoToMeasurement: vi.fn().mockReturnValue({
        sensorDeviceId: null,
        containerId: null,
        measuredAt: new Date(),
        fillLevelPercent: 50,
        temperatureC: null,
        batteryPercent: null,
        signalStrength: null,
        measurementQuality: 'valid',
        sourcePayload: { source: 'iot-ingestion-api', deviceUid: 'sensor-001' },
        receivedAt: new Date(),
      }),
      batchInsertMeasurements: vi.fn().mockResolvedValue({ inserted: 10, failed: 0 }),
      getPendingCount: vi.fn().mockResolvedValue(0),
      getProcessedLastHour: vi.fn().mockResolvedValue(100),
    } as unknown as IngestionRepository;

    mockQueue = new InMemoryIngestionQueue();
    service = new IngestionService(
      {
        get: vi.fn().mockImplementation((key: string) => {
          const config: Record<string, unknown> = {
            IOT_INGESTION_ENABLED: true,
            IOT_MQTT_ENABLED: false,
            IOT_MQTT_TOPIC: 'ecotrack/measurements',
            IOT_QUEUE_CONCURRENCY: 50,
            IOT_QUEUE_BATCH_SIZE: 500,
            IOT_BACKPRESSURE_THRESHOLD: 100000,
            IOT_MAX_BATCH_SIZE: 1000,
          };
          return config[key];
        }),
      } as any,
      mockRepository,
      mockQueue,
    );
  });

  afterEach(() => {
    mockQueue.stopProcessor();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should accept a single measurement', async () => {
    const dto = {
      deviceUid: 'sensor-001',
      measuredAt: new Date().toISOString(),
      fillLevelPercent: 50,
    };

    await service.onModuleInit();
    const result = await service.ingestSingle(dto);

    expect(result.accepted).toBe(1);
    expect(result.processing).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should accept a batch of measurements', async () => {
    const dto = {
      measurements: [
        { deviceUid: 'sensor-001', measuredAt: new Date().toISOString(), fillLevelPercent: 50 },
        { deviceUid: 'sensor-002', measuredAt: new Date().toISOString(), fillLevelPercent: 60 },
      ],
    };

    await service.onModuleInit();
    const result = await service.ingestBatch(dto.measurements);

    expect(result.accepted).toBe(2);
    expect(result.processing).toBe(true);
    expect(result.batchId).toBeDefined();
  });

  it('should reject batch exceeding max size', async () => {
    const measurements = Array.from({ length: 1001 }, (_, i) => ({
      deviceUid: `sensor-${i}`,
      measuredAt: new Date().toISOString(),
      fillLevelPercent: 50,
    }));

    await service.onModuleInit();
    await expect(service.ingestBatch(measurements)).rejects.toThrow('Batch size exceeds maximum');
  });

  it('should return health status', async () => {
    await service.onModuleInit();
    const health = await service.getHealth();

    expect(health.status).toBe('healthy');
    expect(health.queueEnabled).toBe(true);
    expect(health.backpressureActive).toBe(false);
    expect(health.pendingCount).toBeDefined();
  });
});
