import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { IngestionController } from '../modules/iot/ingestion/ingestion.controller.js';
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

describe('IngestionController (HTTP)', () => {
  let app: INestApplication;
  let mockQueue: InMemoryIngestionQueue;
  const iotConfig = {
    IOT_INGESTION_ENABLED: true,
    IOT_MQTT_ENABLED: false,
    IOT_MQTT_TOPIC: 'ecotrack/measurements',
    IOT_QUEUE_CONCURRENCY: 50,
    IOT_QUEUE_BATCH_SIZE: 500,
    IOT_BACKPRESSURE_THRESHOLD: 100000,
    IOT_MAX_BATCH_SIZE: 1000,
  };

  beforeEach(async () => {
    const mockRepository = {
      transformDtoToMeasurement: vi.fn().mockReturnValue({
        sensorDeviceId: null,
        containerId: null,
        measuredAt: new Date(),
        fillLevelPercent: 50,
        temperatureC: null,
        batteryPercent: null,
        signalStrength: null,
        measurementQuality: 'valid',
        sourcePayload: { source: 'iot-ingestion-api' },
        receivedAt: new Date(),
      }),
      batchInsertMeasurements: vi.fn().mockResolvedValue({ inserted: 10, failed: 0 }),
    } as unknown as IngestionRepository;

    mockQueue = new InMemoryIngestionQueue();

    const mockIngestionService = new IngestionService(
      {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'iotIngestion') {
            return iotConfig;
          }

          return undefined;
        }),
      } as any,
      mockRepository,
      mockQueue,
    );

    await mockIngestionService.onModuleInit();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        { provide: IngestionService, useValue: mockIngestionService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    mockQueue.stopProcessor();
    await app.close();
  });

  describe('POST /iot/v1/measurements', () => {
    it('should accept single measurement and return 202', async () => {
      const response = await request(app.getHttpServer())
        .post('/iot/v1/measurements')
        .send({
          deviceUid: 'sensor-001',
          measuredAt: new Date().toISOString(),
          fillLevelPercent: 50,
        })
        .expect(202);

      expect(response.body.accepted).toBe(1);
      expect(response.body.processing).toBe(true);
      expect(response.body.messageId).toBeDefined();
    });

  });

  describe('POST /iot/v1/measurements/batch', () => {
    it('should accept batch and return 202', async () => {
      const response = await request(app.getHttpServer())
        .post('/iot/v1/measurements/batch')
        .send({
          measurements: [
            { deviceUid: 'sensor-001', measuredAt: new Date().toISOString(), fillLevelPercent: 50 },
            { deviceUid: 'sensor-002', measuredAt: new Date().toISOString(), fillLevelPercent: 60 },
          ],
        })
        .expect(202);

      expect(response.body.accepted).toBe(2);
      expect(response.body.processing).toBe(true);
      expect(response.body.batchId).toBeDefined();
    });

    it('rejects empty batches', async () => {
      await request(app.getHttpServer())
        .post('/iot/v1/measurements/batch')
        .send({
          measurements: [],
        })
        .expect(400);
    });
  });

  describe('GET /iot/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/iot/v1/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.queueEnabled).toBe(true);
    });
  });
});
