import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InternalEventPolicyService } from '../modules/events/internal-events.policy.js';
import { ValidatedConsumerProcessorService } from '../modules/iot/validated-consumer/validated-consumer.processor.js';

const createClaimedDelivery = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'delivery-1',
  validatedEventId: 'validated-event-1',
  consumerName: 'timeseries_projection',
  eventName: 'iot.measurement.validated',
  routingKey: 'sensor-001',
  shardId: 4,
  schemaVersion: 'v1',
  claimedByInstanceId: 'worker-b',
  traceparent: null,
  tracestate: null,
  attemptCount: 1,
  measuredAt: new Date('2026-03-20T10:00:00.000Z'),
  sensorDeviceId: 'sensor-1',
  containerId: 'container-1',
  fillLevelPercent: 72,
  temperatureC: 22,
  batteryPercent: 80,
  signalStrength: -75,
  measurementQuality: 'valid',
  warningThreshold: 75,
  criticalThreshold: 90,
  normalizedPayload: { source: 'iot-ingestion-api' },
  emittedAt: new Date('2026-03-20T10:00:01.000Z'),
  ...overrides,
});

describe('ValidatedConsumerProcessorService', () => {
  const repositoryMock = {
    claimDeliveryForProcessing: vi.fn(),
    projectValidatedEvent: vi.fn(),
    markCompleted: vi.fn(),
    markRetryOrFailed: vi.fn(),
  };
  const analyticsProjectionServiceMock = {
    projectValidatedMeasurement: vi.fn(),
  };
  const anomalyAlertProjectionServiceMock = {
    projectValidatedMeasurement: vi.fn(),
  };
  const eventConnectorsServiceMock = {
    stageExport: vi.fn(),
  };

  let service: ValidatedConsumerProcessorService;
  let loggerMock: {
    setContext: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loggerMock = {
      setContext: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };
    service = new ValidatedConsumerProcessorService(
      repositoryMock as any,
      {
        getInstanceId: vi.fn().mockReturnValue('worker-b'),
      } as any,
      {
        assertConsumerAuthorized: vi.fn(),
      } as unknown as InternalEventPolicyService,
      {
        projectValidatedEventRollup: vi.fn().mockResolvedValue({
          validatedEventId: 'validated-event-1',
        }),
      } as any,
      analyticsProjectionServiceMock as any,
      anomalyAlertProjectionServiceMock as any,
      eventConnectorsServiceMock as any,
      {
        recordServiceHop: vi.fn(),
      } as any,
      loggerMock as any,
    );
  });

  it('skips deliveries that are already claimed elsewhere', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(null);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'skipped',
    });

    expect(repositoryMock.projectValidatedEvent).not.toHaveBeenCalled();
    expect(repositoryMock.markCompleted).not.toHaveBeenCalled();
  });

  it('projects and completes claimed deliveries', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(createClaimedDelivery());
    repositoryMock.projectValidatedEvent.mockResolvedValueOnce({ measurementId: 'measurement-1' });
    repositoryMock.markCompleted.mockResolvedValueOnce(undefined);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'completed',
    });

    expect(repositoryMock.claimDeliveryForProcessing).toHaveBeenCalledWith(
      'delivery-1',
      'timeseries_projection',
      'worker-b',
    );
    expect(repositoryMock.projectValidatedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delivery-1',
        validatedEventId: 'validated-event-1',
      }),
    );
    expect(repositoryMock.markCompleted).toHaveBeenCalledWith('delivery-1');
  });

  it('projects rollup deliveries through the rollup service', async () => {
    const rollupService = {
      projectValidatedEventRollup: vi.fn().mockResolvedValue({
        validatedEventId: 'validated-event-1',
      }),
    };
    service = new ValidatedConsumerProcessorService(
      repositoryMock as any,
      {
        getInstanceId: vi.fn().mockReturnValue('worker-b'),
      } as any,
      {
        assertConsumerAuthorized: vi.fn(),
      } as unknown as InternalEventPolicyService,
      rollupService as any,
      analyticsProjectionServiceMock as any,
      anomalyAlertProjectionServiceMock as any,
      eventConnectorsServiceMock as any,
      {
        recordServiceHop: vi.fn(),
      } as any,
      loggerMock as any,
    );
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(
      createClaimedDelivery({ consumerName: 'measurement_rollup_projection' }),
    );
    repositoryMock.markCompleted.mockResolvedValueOnce(undefined);

    await expect(service.processDelivery('delivery-1', 'measurement_rollup_projection')).resolves.toEqual({
      status: 'completed',
    });

    expect(rollupService.projectValidatedEventRollup).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delivery-1',
        consumerName: 'measurement_rollup_projection',
      }),
    );
    expect(repositoryMock.projectValidatedEvent).not.toHaveBeenCalled();
  });

  it('marks retryable failures below the retry ceiling', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(
      createClaimedDelivery({ attemptCount: 2 }),
    );
    repositoryMock.projectValidatedEvent.mockRejectedValueOnce(new Error('projection failed'));
    repositoryMock.markRetryOrFailed.mockResolvedValueOnce(undefined);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'retry',
    });

    expect(repositoryMock.markRetryOrFailed).toHaveBeenCalledWith(
      'delivery-1',
      2,
      'projection failed',
      expect.any(Date),
    );
  });

  it('marks deliveries as failed once the retry budget is exhausted', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(
      createClaimedDelivery({ attemptCount: 3 }),
    );
    repositoryMock.projectValidatedEvent.mockRejectedValueOnce(new Error('projection failed'));
    repositoryMock.markRetryOrFailed.mockResolvedValueOnce(undefined);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'failed',
    });
  });
});
