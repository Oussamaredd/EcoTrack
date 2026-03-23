import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminEventWorkflowService } from '../modules/admin/admin.event-workflow.service.js';

describe('AdminEventWorkflowService', () => {
  const repositoryMock = {
    listReplayableStagedEvents: vi.fn(),
    markStagedEventsForReplay: vi.fn(),
    listReplayableDeliveries: vi.fn(),
    listReplayableDeliveryRefsByIds: vi.fn(),
    markDeliveriesForReplay: vi.fn(),
  };

  const ingestionServiceMock = {
    replayStagedEventRefs: vi.fn(),
  };

  const validatedConsumerServiceMock = {
    replayDeliveryRefs: vi.fn(),
  };

  const internalEventPolicyMock = {
    assertReplayable: vi.fn(),
  };

  const auditServiceMock = {
    log: vi.fn(),
  };

  let service: AdminEventWorkflowService;
  let deliveryReplayCallOrder: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    deliveryReplayCallOrder = [];

    repositoryMock.markStagedEventsForReplay.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        routingKey: 'sensor-001',
        shardId: 3,
      },
    ]);
    repositoryMock.listReplayableDeliveryRefsByIds.mockImplementation(async () => {
      deliveryReplayCallOrder.push('list');
      return [
        {
          id: '22222222-2222-4222-8222-222222222222',
          eventName: 'iot.measurement.validated',
          shardId: 4,
        },
      ];
    });
    repositoryMock.markDeliveriesForReplay.mockImplementation(async () => {
      deliveryReplayCallOrder.push('mark');
      return [
        {
          id: '22222222-2222-4222-8222-222222222222',
          eventName: 'iot.measurement.validated',
          shardId: 4,
        },
      ];
    });
    ingestionServiceMock.replayStagedEventRefs.mockResolvedValue(undefined);
    validatedConsumerServiceMock.replayDeliveryRefs.mockResolvedValue(undefined);
    internalEventPolicyMock.assertReplayable.mockReturnValue(undefined);
    auditServiceMock.log.mockResolvedValue(undefined);

    service = new AdminEventWorkflowService(
      repositoryMock as any,
      ingestionServiceMock as any,
      validatedConsumerServiceMock as any,
      internalEventPolicyMock as any,
      auditServiceMock as any,
    );
  });

  it('replays staged events and records an audit entry', async () => {
    await expect(
      service.replayStagedEvents(
        {
          eventIds: ['11111111-1111-4111-8111-111111111111'],
          reason: ' operator replay ',
          allowRejectedReplay: true,
        },
        '33333333-3333-4333-8333-333333333333',
      ),
    ).resolves.toEqual({
      replayed: 1,
      eventIds: ['11111111-1111-4111-8111-111111111111'],
    });

    expect(repositoryMock.markStagedEventsForReplay).toHaveBeenCalledWith(
      ['11111111-1111-4111-8111-111111111111'],
      '33333333-3333-4333-8333-333333333333',
      'operator replay',
      true,
    );
    expect(ingestionServiceMock.replayStagedEventRefs).toHaveBeenCalledWith([
      {
        id: '11111111-1111-4111-8111-111111111111',
        routingKey: 'sensor-001',
        shardId: 3,
      },
    ]);
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '33333333-3333-4333-8333-333333333333',
        action: 'iot_ingestion_events_replayed',
        resourceType: 'iot_ingestion_events',
      }),
    );
  });

  it('rejects staged replay requests when no rows are eligible', async () => {
    repositoryMock.markStagedEventsForReplay.mockResolvedValueOnce([]);

    await expect(
      service.replayStagedEvents(
        {
          eventIds: ['11111111-1111-4111-8111-111111111111'],
          reason: 'operator replay',
          allowRejectedReplay: false,
        },
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(ingestionServiceMock.replayStagedEventRefs).not.toHaveBeenCalled();
    expect(auditServiceMock.log).not.toHaveBeenCalled();
  });

  it('validates delivery replayability before mutating durable rows', async () => {
    internalEventPolicyMock.assertReplayable.mockImplementationOnce(() => {
      throw new BadRequestException('Internal event is not replayable.');
    });

    await expect(
      service.replayDeliveries(
        {
          deliveryIds: ['22222222-2222-4222-8222-222222222222'],
          reason: 'operator replay',
        },
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(repositoryMock.listReplayableDeliveryRefsByIds).toHaveBeenCalledWith([
      '22222222-2222-4222-8222-222222222222',
    ]);
    expect(repositoryMock.markDeliveriesForReplay).not.toHaveBeenCalled();
    expect(validatedConsumerServiceMock.replayDeliveryRefs).not.toHaveBeenCalled();
    expect(auditServiceMock.log).not.toHaveBeenCalled();
  });

  it('replays eligible deliveries after prevalidation and audits the action', async () => {
    await expect(
      service.replayDeliveries(
        {
          deliveryIds: ['22222222-2222-4222-8222-222222222222'],
          reason: ' operator replay ',
        },
        '33333333-3333-4333-8333-333333333333',
      ),
    ).resolves.toEqual({
      replayed: 1,
      deliveryIds: ['22222222-2222-4222-8222-222222222222'],
    });

    expect(repositoryMock.listReplayableDeliveryRefsByIds).toHaveBeenCalledWith([
      '22222222-2222-4222-8222-222222222222',
    ]);
    expect(repositoryMock.markDeliveriesForReplay).toHaveBeenCalledWith(
      ['22222222-2222-4222-8222-222222222222'],
      '33333333-3333-4333-8333-333333333333',
      'operator replay',
    );
    expect(deliveryReplayCallOrder).toEqual(['list', 'mark']);
    expect(validatedConsumerServiceMock.replayDeliveryRefs).toHaveBeenCalledWith([
      {
        id: '22222222-2222-4222-8222-222222222222',
        shardId: 4,
      },
    ]);
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '33333333-3333-4333-8333-333333333333',
        action: 'validated_event_deliveries_replayed',
        resourceType: 'validated_event_deliveries',
      }),
    );
  });
});
